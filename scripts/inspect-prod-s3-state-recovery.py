#!/usr/bin/env python3
"""Read-only PROD Terraform recovery probe.

Verifies the THREE actual S3 lifecycle rules against their expected Terraform
definitions, the current remote state, ACM status, and the failed-run S3 lock
metadata. Never prints S3 state or lock body, resource IDs, secrets or tokens.
Does not force-unlock, import, change DNS, or mutate AWS.
"""
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from audit_prod_helpers import state_addresses

ACCOUNT = "098859530205"
APP_REGION = "ap-south-1"
STATE_REGION = "us-east-1"
STATE_BUCKET = "broandbro-tfstate-098859530205-ap-south-1"
STATE_KEY = "env/prod/terraform.tfstate"
LOCK_KEY = STATE_KEY + ".tflock"
CERTIFICATE = ("arn:aws:acm:us-east-1:098859530205:certificate/"
               "5d22a443-1d74-4c5a-9bf0-4f0dc4409e71")
TARGETS = [
    ("module.location_images.aws_s3_bucket_lifecycle_configuration.this",
     f"broandbro-prod-locations-{ACCOUNT}", "noncurrent-versions"),
    ("module.media.aws_s3_bucket_lifecycle_configuration.this",
     f"broandbro-prod-media-{ACCOUNT}", "noncurrent-versions"),
    ("module.s3.aws_s3_bucket_lifecycle_configuration.this",
     f"broandbro-prod-ui-{ACCOUNT}", "expire-old-versions"),
]


def aws(*parts, region=APP_REGION):
    p = subprocess.run(["aws", *parts, "--region", region, "--output", "json"],
                       capture_output=True, text=True, check=False)
    if p.returncode:
        return None
    try:
        return json.loads(p.stdout)
    except (ValueError, TypeError):
        return None


def get_object_as_json(bucket, key, region):
    fd, filename = tempfile.mkstemp(prefix="prod-recovery-")
    os.close(fd)
    os.chmod(filename, 0o600)
    try:
        p = subprocess.run(
            ["aws", "s3api", "get-object", "--bucket", bucket, "--key", key,
             "--expected-bucket-owner", ACCOUNT, "--region", region,
             filename], capture_output=True, text=True, check=False)
        if p.returncode:
            return None
        with open(filename, "r", encoding="utf8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None
    finally:
        Path(filename).unlink(missing_ok=True)


def lifecycle_matches(response, rule_id):
    rules = response.get("Rules")
    if not isinstance(rules, list) or len(rules) != 1:
        return False
    r = rules[0]
    nc = r.get("NoncurrentVersionExpiration") or {}
    abort = r.get("AbortIncompleteMultipartUpload") or {}
    flt = r.get("Filter") or {}
    return (
        r.get("ID") == rule_id and r.get("Status") == "Enabled"
        and nc.get("NoncurrentDays") == 30
        and abort.get("DaysAfterInitiation") == 7
        and not r.get("Transitions") and not r.get("Expiration")
        and not r.get("NoncurrentVersionTransitions")
        and flt in ({}, {"Prefix": ""})
        and r.get("Prefix") in (None, "")
    )


def is_stale_failed_run_lock(lock):
    if not isinstance(lock, dict):
        return False
    if not re.fullmatch(r"[0-9a-fA-F-]{20,50}", str(lock.get("ID", ""))):
        return False
    if lock.get("Operation") != "OperationTypeApply":
        return False
    # The lock must belong to the exact PROD remote-state location, not any
    # unrelated workspace. Never display this potentially sensitive string.
    location = str(lock.get("Path", ""))
    if STATE_BUCKET not in location or STATE_KEY not in location:
        return False
    stamp = str(lock.get("Created", ""))
    try:
        dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return False
    if dt.tzinfo is None:
        return False
    return (
        datetime(2026, 11, 15, 12, 7, tzinfo=timezone.utc)
        <= dt.astimezone(timezone.utc)
        <= datetime(2026, 11, 15, 13, 8, tzinfo=timezone.utc)
    )


def main():
    identity = aws("sts", "get-caller-identity")
    if not identity or identity.get("Account") != ACCOUNT:
        print("PROD RECOVERY: BLOCKED; wrong account or unreadable identity")
        return 2

    state = get_object_as_json(STATE_BUCKET, STATE_KEY, STATE_REGION)
    if not isinstance(state, dict):
        print("PROD RECOVERY: BLOCKED; cannot read current state privately")
        return 2
    tracked = state_addresses(state)
    print("PROD S3 LIFECYCLE RECOVERY — READ ONLY")
    print("Account guard: PASS; remote state contents: HIDDEN")
    print("Current state serial:", state.get("serial", "UNKNOWN"))
    print("Current state lineage:", "PRESENT" if state.get("lineage") else "MISSING")

    needs_import = []
    failures = False
    for address, bucket, rule in TARGETS:
        head = subprocess.run(
            ["aws", "s3api", "head-bucket", "--bucket", bucket,
             "--expected-bucket-owner", ACCOUNT, "--region", APP_REGION],
            capture_output=True, text=True, check=False)
        owner_ok = head.returncode == 0
        rule_data = aws("s3api", "get-bucket-lifecycle-configuration",
                        "--bucket", bucket, "--expected-bucket-owner", ACCOUNT)
        exact = bool(rule_data) and lifecycle_matches(rule_data, rule)
        tracked_ok = address in tracked
        print(f"S3 LIFECYCLE: {address}: owner={'VERIFIED' if owner_ok else 'UNKNOWN'};"
              f" live_rule={'MATCH' if exact else 'MISSING_OR_DIFFERENT'};"
              f" state={'TRACKED' if tracked_ok else 'NOT_TRACKED'}")
        if not owner_ok or not exact:
            failures = True
        if exact and owner_ok and not tracked_ok:
            needs_import.append(address)

    lock = get_object_as_json(STATE_BUCKET, LOCK_KEY, STATE_REGION)
    if lock is None:
        # Distinguish absent from unreadable. Metadata-only HeadObject is not
        # enough: an AccessDenied must NEVER be treated as no lock.
        listed = aws("s3api", "list-objects-v2", "--bucket", STATE_BUCKET,
                     "--expected-bucket-owner", ACCOUNT,
                     "--prefix", LOCK_KEY, region=STATE_REGION)
        if not listed:
            print("LOCK: UNKNOWN; cannot enumerate lock objects")
            failures = True
        elif any(item.get("Key") == LOCK_KEY for item in listed.get("Contents", [])):
            print("LOCK: PRESENT BUT UNREADABLE; manual investigation required")
            failures = True
        else:
            print("LOCK: ABSENT")
    else:
        if is_stale_failed_run_lock(lock):
            print("LOCK: PRESENT; matches failed Apply timestamp, path and operation")
        else:
            print("LOCK: PRESENT; ownership does not match the failed Apply")
            failures = True
        print("LOCK REMOVAL: NEVER AUTOMATIC; no concurrent Terraform run may hold it")
        failures = True

    cert = aws("acm", "describe-certificate", "--certificate-arn", CERTIFICATE,
               region=STATE_REGION)
    cert_status = (cert or {}).get("Certificate", {}).get("Status", "UNKNOWN")
    print("ACM:", cert_status)
    failures |= cert_status != "ISSUED"
    print(f"Expected imports from live verified lifecycle rules: {len(needs_import)}")
    for address in needs_import:
        print("IMPORT_CANDIDATE:", address)

    print("PRECHECK:", "BLOCKED" if failures or needs_import else "CONSISTENT")
    print("This check has not performed or authorized any Terraform state writes.")
    return 1 if failures or needs_import else 0


if __name__ == "__main__":
    raise SystemExit(main())
