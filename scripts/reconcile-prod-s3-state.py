#!/usr/bin/env python3
"""Explicitly approved, narrow PROD Terraform state repair for failed Apply 43712225552.

Changes ONLY the production Terraform state: safely clears the EXACT failed-run
lock (after proving it matches) and imports THREE pre-existing S3 lifecycle
configurations. Does NOT create/delete buckets, edit lifecycle rules, modify
DNS/ACM, deploy services, or run terraform apply.

Fail-closed with a restricted in-bucket snapshot before any state mutation.
No Terraform state contents, secret values or lock ID printed to logs.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from audit_prod_helpers import state_addresses
import runpy
recovery_probe = runpy.run_path(
    str(Path(__file__).resolve().with_name("inspect-prod-s3-state-recovery.py"))
)
(ACCOUNT, APP_REGION, STATE_REGION, STATE_BUCKET, STATE_KEY, LOCK_KEY,
 CERTIFICATE, TARGETS, aws, get_object_as_json,
 is_stale_failed_run_lock, lifecycle_matches) = (
    recovery_probe[name] for name in (
        "ACCOUNT", "APP_REGION", "STATE_REGION", "STATE_BUCKET", "STATE_KEY",
        "LOCK_KEY", "CERTIFICATE", "TARGETS", "aws", "get_object_as_json",
        "is_stale_failed_run_lock", "lifecycle_matches"
    )
)

EXPECTED_CONFIRM = "RECOVER_FAILED_PROD_STATE_43712225552"
RUN = "43712225552"
ROOT = Path(__file__).resolve().parents[1] / "infra" / "environments" / "prod"


def command(args, *, cwd=None):
    # Suppress raw CLI output. Terraform state and provider values must never
    # be sent to GitHub logs (even on errors).
    return subprocess.run(args, text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=False, cwd=cwd)


def require(condition, message):
    if not condition:
        print("RECOVERY BLOCKED:", message)
        raise SystemExit(2)


def guard_github():
    require(os.getenv("PROD_RECOVERY_CONFIRM") == EXPECTED_CONFIRM,
            "manual production recovery confirmation missing")
    require(os.getenv("GITHUB_REF") == "refs/heads/main" and
            os.getenv("GITHUB_REPOSITORY") == "operationReact/qrapp",
            "must run from qrapp/main")
    require(os.getenv("TF_VAR_expected_account_id") == ACCOUNT,
            "wrong Terraform target account setting")
    require(bool(os.getenv("GH_TOKEN")), "GitHub Actions read token unavailable")

    prior = command(["gh", "api", "repos/operationReact/qrapp/actions/runs/" + RUN])
    require(prior.returncode == 0, "cannot verify historical failed run")
    try:
        j = json.loads(prior.stdout)
    except ValueError:
        require(False, "cannot parse failed-run status")
    require(j.get("status") == "completed" and j.get("conclusion") == "failure",
            "original failed run not fully terminated")

    active = command(["gh", "api",
                      "repos/operationReact/qrapp/actions/workflows/"
                      "terraform-apply-prod.yml/runs?per_page=50"])
    require(active.returncode == 0, "cannot inspect other PROD Apply runs")
    try:
        live = json.loads(active.stdout).get("workflow_runs", [])
    except ValueError:
        require(False, "cannot parse Apply workflow status")
    require(all(r.get("status") == "completed" for r in live),
            "another production Terraform Apply run is active")


def guard_live():
    ident = aws("sts", "get-caller-identity")
    require(ident is not None and ident.get("Account") == ACCOUNT,
            "GitHub OIDC role is not in approved production account")
    cert = aws("acm", "describe-certificate", "--certificate-arn", CERTIFICATE,
               region=STATE_REGION)
    require(cert is not None and cert.get("Certificate", {}).get("Status") == "ISSUED",
            "ACM certificate not issued")

    for addr, bucket, expected_rule in TARGETS:
        head = command(["aws", "s3api", "head-bucket", "--bucket", bucket,
                        "--expected-bucket-owner", ACCOUNT,
                        "--region", APP_REGION])
        require(head.returncode == 0, "target bucket ownership not verified for " + addr)
        rule = aws("s3api", "get-bucket-lifecycle-configuration",
                   "--bucket", bucket, "--expected-bucket-owner", ACCOUNT)
        require(rule is not None and lifecycle_matches(rule, expected_rule),
                "live S3 lifecycle configuration mismatch for " + addr)


def guard_state():
    state = get_object_as_json(STATE_BUCKET, STATE_KEY, STATE_REGION)
    require(isinstance(state, dict), "production state could not be inspected")
    require(state.get("serial") == 2 and bool(state.get("lineage")),
            "production state serial/lineage differs from audited failed run")
    tracked = state_addresses(state)
    missing = {address for address, _, _ in TARGETS}
    require(len(tracked) == 63 and not (missing & tracked),
            "state resource inventory has changed; re-audit before repair")
    lock = get_object_as_json(STATE_BUCKET, LOCK_KEY, STATE_REGION)
    require(is_stale_failed_run_lock(lock),
            "lock not proven to be from exact failed Nov 15 Apply")
    return state["lineage"], lock["ID"]


def backup_remote_state():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = ("env/prod/recovery-backups/failed-43712225552/"
           f"state-before-import-{stamp}-run-{os.getenv('GITHUB_RUN_ID', 'manual')}.tfstate")
    copy = command(["aws", "s3api", "copy-object",
                    "--bucket", STATE_BUCKET,
                    "--key", key,
                    "--copy-source", STATE_BUCKET + "/" + STATE_KEY,
                    "--server-side-encryption", "AES256",
                    "--expected-bucket-owner", ACCOUNT,
                    "--region", STATE_REGION])
    require(copy.returncode == 0, "cannot preserve encrypted state backup")
    print("STATE BACKUP: private, versioned S3 recovery copy created")
    # Deliberately do not print the S3 key. The exact key is in the code.
    return key


def terraform(args):
    p = command(["terraform", *args], cwd=ROOT)
    require(p.returncode == 0,
            "Terraform command failed (contents suppressed): " + args[0])


def import_resources(lock_id):
    terraform([
        "init", "-input=false", "-reconfigure",
        f"-backend-config=bucket={STATE_BUCKET}",
        f"-backend-config=key={STATE_KEY}",
        f"-backend-config=region={STATE_REGION}",
        "-backend-config=encrypt=true",
        "-backend-config=use_lockfile=true",
    ])
    # Unique lock ID + exact failure timestamp/path were checked above.
    # GitHub Actions workflow concurrency also uses the Terraform Apply group.
    terraform(["force-unlock", "-force", lock_id])
    print("FAILED APPLY LOCK: verified original lock released")

    for addr, bucket, _ in TARGETS:
        terraform(["import", "-input=false", "-no-color",
                   "-lock-timeout=90s", addr, bucket])
        print("STATE IMPORTED:", addr)


def validate_outcome(original_lineage):
    state = get_object_as_json(STATE_BUCKET, STATE_KEY, STATE_REGION)
    require(isinstance(state, dict) and state.get("lineage") == original_lineage,
            "state lineage changed after imports")
    addresses = state_addresses(state)
    require(len(addresses) == 66 and all(a in addresses for a, _, _ in TARGETS),
            "not all three existing lifecycle configurations are tracked")
    probe = aws("s3api", "list-objects-v2", "--bucket", STATE_BUCKET,
                "--prefix", LOCK_KEY, "--expected-bucket-owner", ACCOUNT,
                region=STATE_REGION)
    require(probe is not None, "unable to verify state lock after import")
    require(not any(o.get("Key") == LOCK_KEY for o in probe.get("Contents", [])),
            "a Terraform state lock remains after recovery")
    print("RECOVERY SUCCESS: 66 Terraform instances tracked; failed lock cleared.")
    print("NO TERRAFORM APPLY PERFORMED. Review a new plan before provisioning.")


def main():
    print("PROD STATE RECONCILIATION: narrow scope, audited main branch only")
    guard_github()
    guard_live()
    lineage, lock_id = guard_state()
    backup_remote_state()
    import_resources(lock_id)
    validate_outcome(lineage)
    return 0


if __name__ == "__main__":
    sys.exit(main())
