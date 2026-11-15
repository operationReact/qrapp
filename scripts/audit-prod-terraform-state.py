#!/usr/bin/env python3
"""Compare the failed PROD Apply's creation log with encrypted remote Terraform state.

READ ONLY: downloads the state privately into a temporary file on the GitHub
runner, parses ONLY resource addresses/lineage/serial, deletes the file.
Never prints or uploads state values, credentials, outputs, IDs or state JSON.
Does not remove .tflock, push state, import resources or change AWS.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ACCOUNT = "098859530205"
BUCKET = "broandbro-tfstate-098859530205-ap-south-1"
KEY = "env/prod/terraform.tfstate"
REGION = "us-east-1"
MANIFEST = Path(__file__).with_name("prod-apply-43712225552-completed.json")


def cli(*args):
    return subprocess.run(["aws", *args, "--region", REGION, "--output", "json"],
                          text=True, capture_output=True, check=False)


def state_addresses(state):
    out = set()
    for resource in state.get("resources", []):
        if resource.get("mode", "managed") != "managed":
            continue
        prefix = (resource.get("module", "") + ".") if resource.get("module") else ""
        base = prefix + resource["type"] + "." + resource["name"]
        for inst in resource.get("instances", []):
            if "index_key" not in inst:
                out.add(base)
            else:
                key = inst["index_key"]
                out.add(base + "[" + (json.dumps(key, ensure_ascii=True) if isinstance(key, str)
                                      else str(key)) + "]")
    return out


def main():
    identity = cli("sts", "get-caller-identity")
    if identity.returncode != 0:
        print("STATE AUDIT BLOCKED: cannot verify AWS identity")
        return 2
    try:
        caller = json.loads(identity.stdout).get("Account")
    except (ValueError, AttributeError):
        print("STATE AUDIT BLOCKED: invalid AWS identity response")
        return 2
    if caller != ACCOUNT:
        print("STATE AUDIT BLOCKED: caller is not target production account")
        return 2

    head = cli("s3api", "head-object", "--bucket", BUCKET, "--key", KEY,
               "--expected-bucket-owner", ACCOUNT)
    if head.returncode != 0:
        print("STATE AUDIT BLOCKED: remote state missing or unreadable")
        return 2

    list_lock = cli("s3api", "list-objects-v2", "--bucket", BUCKET,
                    "--prefix", KEY + ".tflock", "--expected-bucket-owner", ACCOUNT)
    if list_lock.returncode != 0:
        print("STATE AUDIT BLOCKED: unable to check state lock")
        return 2
    try:
        locks = [obj.get("Key") for obj in json.loads(list_lock.stdout).get("Contents", [])]
        locked = (KEY + ".tflock") in locks
    except (ValueError, TypeError):
        print("STATE AUDIT BLOCKED: cannot parse state lock listing")
        return 2

    versions = cli("s3api", "list-object-versions", "--bucket", BUCKET,
                   "--prefix", KEY, "--expected-bucket-owner", ACCOUNT)
    if versions.returncode != 0:
        print("STATE AUDIT BLOCKED: cannot list state versions")
        return 2
    try:
        version_count = sum(v.get("Key") == KEY
                            for v in json.loads(versions.stdout).get("Versions", []))
    except (ValueError, TypeError):
        print("STATE AUDIT BLOCKED: invalid state version metadata")
        return 2

    fd, filename = tempfile.mkstemp(prefix="broandbro-state-readonly-", suffix=".json")
    os.close(fd)
    os.chmod(filename, 0o600)
    try:
        result = cli("s3api", "get-object", "--bucket", BUCKET, "--key", KEY,
                     "--expected-bucket-owner", ACCOUNT, filename)
        if result.returncode != 0:
            print("STATE AUDIT BLOCKED: state object could not be read")
            return 2
        with open(filename, "r", encoding="utf-8") as stream:
            state = json.load(stream)
        tracked = state_addresses(state)
        serial = state.get("serial")
        lineage_present = isinstance(state.get("lineage"), str) and bool(state.get("lineage"))
    except (OSError, ValueError, KeyError, TypeError):
        print("STATE AUDIT BLOCKED: remote state malformed or unreadable")
        return 2
    finally:
        os.unlink(filename)

    with MANIFEST.open("r", encoding="utf-8") as stream:
        manifest = json.load(stream)
    created = set(manifest["completed_resource_addresses"])
    not_tracked = sorted(created - tracked)
    remaining = sorted(tracked - created)

    print("Production partial-apply state reconciliation (READ ONLY)")
    print("AWS identity: VERIFIED; state content: NEVER PRINTED")
    print("Remote state file: PRESENT")
    print(f"Remote state serial: {serial if isinstance(serial, int) else 'UNRECOGNIZED'}")
    print(f"Remote state lineage: {'PRESENT' if lineage_present else 'INVALID'}")
    print(f"Remote state versions: {version_count}")
    print(f"Remote Terraform lock: {'PRESENT - DO NOT UNLOCK BLINDLY' if locked else 'ABSENT'}")
    print(f"Resource instances currently tracked: {len(tracked)}")
    print(f"Resources reported created in failed run: {len(created)}")
    print(f"Created-in-run addresses absent from remote state: {len(not_tracked)}")
    print(f"Tracked addresses outside failed-run creation list: {len(remaining)}")
    print("Note: even tracked resources must be checked against live AWS IDs and ownership.")
    for addr in not_tracked:
        print("UNTRACKED_CREATED_ADDRESS: " + addr)
    print("RECOVERY STATUS: BLOCKED. No Apply, import, push, DNS edit or lock removal performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
