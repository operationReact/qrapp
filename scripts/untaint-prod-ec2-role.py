#!/usr/bin/env python3
"""One-time guarded recovery of a tainted, verified PROD EC2 IAM role.

This changes only Terraform's remote *taint marker*. It does not delete, create,
or modify the IAM role, any AWS application resource, DNS or SSM secret.
It backs up the private state before changing it, and prints no state contents.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import unquote

ACCOUNT = "098859530205"
AWS_REGION = "ap-south-1"
STATE_REGION = "us-east-1"
BUCKET = f"broandbro-tfstate-{ACCOUNT}-ap-south-1"
STATE_KEY = "env/prod/terraform.tfstate"
LOCK_KEY = STATE_KEY + ".tflock"
ROLE = "broandbro-prod-ec2-role"
ADDRESS = "module.ec2.aws_iam_role.ec2"
ROOT = Path(__file__).resolve().parents[1] / "infra" / "environments" / "prod"


def run(cmd, *, cwd=None):
    return subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True, check=False)


def aws(*args, region=AWS_REGION):
    p = run(["aws", *args, "--region", region, "--output", "json"])
    if p.returncode:
        return None
    try:
        return json.loads(p.stdout)
    except (ValueError, TypeError):
        return None


def require(value, message):
    if not value:
        print("SAFE UNTAINT BLOCKED: " + message, file=sys.stderr)
        raise SystemExit(2)


def private_state():
    fd, filename = tempfile.mkstemp(prefix="broandbro-untaint-state-", suffix=".json")
    os.close(fd)
    os.chmod(filename, 0o600)
    try:
        p = run(["aws", "s3api", "get-object", "--bucket", BUCKET,
                 "--key", STATE_KEY, "--expected-bucket-owner", ACCOUNT,
                 "--region", STATE_REGION, filename])
        require(p.returncode == 0, "remote state cannot be safely read")
        with open(filename, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        require(False, "remote state is not valid JSON")
    finally:
        Path(filename).unlink(missing_ok=True)


def role_instance(state):
    matches = [r for r in state.get("resources", [])
               if r.get("mode", "managed") == "managed"
               and r.get("module") == "module.ec2"
               and r.get("type") == "aws_iam_role" and r.get("name") == "ec2"]
    require(len(matches) == 1, "target role not unique in remote state")
    instances = matches[0].get("instances", [])
    require(len(instances) == 1 and "index_key" not in instances[0],
            "unexpected role instance shape")
    return instances[0]


def verify_role_and_state():
    identity = aws("sts", "get-caller-identity")
    require(identity and identity.get("Account") == ACCOUNT, "unexpected AWS identity")
    require(os.getenv("GITHUB_REF") == "refs/heads/main"
            and os.getenv("GITHUB_REPOSITORY") == "operationReact/qrapp",
            "workflow must run from qrapp/main")
    require(os.getenv("GITHUB_EVENT_NAME") in ("workflow_dispatch", "push"),
            "unapproved GitHub event")
    require(os.getenv("TF_VAR_expected_account_id") == ACCOUNT,
            "Terraform target-account guard missing")

    listing = aws("s3api", "list-objects-v2", "--bucket", BUCKET,
                  "--expected-bucket-owner", ACCOUNT,
                  "--prefix", LOCK_KEY, region=STATE_REGION)
    require(listing is not None, "cannot inspect remote state lock")
    require(not any(o.get("Key") == LOCK_KEY for o in listing.get("Contents", [])),
            "another state lock exists")

    state = private_state()
    require(state.get("serial") == 5 and isinstance(state.get("lineage"), str)
            and bool(state.get("lineage")), "state serial/lineage changed; investigate")
    inst = role_instance(state)
    require(inst.get("status") == "tainted",
            "role state is not exactly tainted; refuse redundant mutation")
    attributes = inst.get("attributes") or {}
    require(attributes.get("id") == ROLE and attributes.get("name") == ROLE,
            "state role name/ID mismatch")

    response = aws("iam", "get-role", "--role-name", ROLE)
    require(response and isinstance(response.get("Role"), dict),
            "live IAM role not found or unreadable")
    live = response["Role"]
    require(live.get("RoleName") == ROLE
            and live.get("Arn") == f"arn:aws:iam::{ACCOUNT}:role/{ROLE}",
            "live IAM role belongs to another name/account")
    require(attributes.get("unique_id")
            and attributes.get("unique_id") == live.get("RoleId"),
            "state identity does not match live IAM role unique ID")

    tags = {t.get("Key"): t.get("Value") for t in live.get("Tags", [])}
    require(tags.get("Environment") == "prod" and tags.get("Project") == "broandbro",
            "unexpected IAM resource tags")
    trust = live.get("AssumeRolePolicyDocument")
    if isinstance(trust, str):
        try:
            trust = json.loads(unquote(trust))
        except ValueError:
            require(False, "cannot decode role trust document")
    statements = trust.get("Statement", []) if isinstance(trust, dict) else []
    if isinstance(statements, dict):
        statements = [statements]
    def ec2_trust(statement):
        principal = statement.get("Principal") or {}
        service = principal.get("Service", [])
        actions = statement.get("Action", [])
        if isinstance(service, str):
            service = [service]
        if isinstance(actions, str):
            actions = [actions]
        return ("ec2.amazonaws.com" in service and
                "sts:AssumeRole" in actions and statement.get("Effect") == "Allow")
    require(len(statements) == 1 and ec2_trust(statements[0]),
            "live IAM role trust differs from single expected EC2 statement")
    print("GUARDS PASSED: verified account, isolated state, no lock, exact IAM role identity")
    return state.get("lineage")


def backup_remote_state():
    run_id = os.getenv("GITHUB_RUN_ID", "")
    require(run_id.isdigit(), "GitHub run ID absent")
    backup = (f"env/prod/recovery-backups/tainted-ec2-role/"
              f"state-before-untaint-run-{run_id}.tfstate")
    result = run(["aws", "s3api", "copy-object", "--bucket", BUCKET,
                  "--key", backup, "--copy-source", f"{BUCKET}/{STATE_KEY}",
                  "--expected-bucket-owner", ACCOUNT,
                  "--server-side-encryption", "AES256", "--region", STATE_REGION])
    require(result.returncode == 0, "cannot create private encrypted state backup")
    print("STATE BACKUP: private, encrypted, created before modification")


def terraform(*args):
    p = run(["terraform", *args], cwd=ROOT)
    require(p.returncode == 0, "Terraform command failed: " + args[0])
    return p.stdout


def verify_after(original_lineage):
    state = private_state()
    require(state.get("lineage") == original_lineage,
            "unexpected remote state lineage after untaint")
    require(state.get("serial") == 6, "unexpected Terraform state serial after untaint")
    inst = role_instance(state)
    require(inst.get("status", "") != "tainted",
            "taint marker is still present")
    require(inst.get("attributes", {}).get("id") == ROLE,
            "role identity changed unexpectedly")
    print("STATE RECOVERY: taint removed; role remains in Terraform state")


def validate_plan():
    with tempfile.TemporaryDirectory(prefix="broandbro-plan-") as d:
        filename = str(Path(d) / "plan.out")
        terraform("plan", "-input=false", "-lock=false", "-no-color", "-out=" + filename)
        shown = terraform("show", "-json", filename)
        try:
            data = json.loads(shown)
            changes = data.get("resource_changes", [])
            additions = sum("create" in x.get("change", {}).get("actions", [])
                            for x in changes)
            replacements_or_deletes = [x.get("address", "unknown") for x in changes
                                       if "delete" in x.get("change", {}).get("actions", [])]
            updates = sum(x.get("change", {}).get("actions") == ["update"]
                          for x in changes)
        except (ValueError, TypeError, KeyError):
            require(False, "cannot parse non-applying plan")
        print(f"RECONCILED PLAN: adds={additions}, in-place updates={updates}, "
              f"deletions/replacements={len(replacements_or_deletes)}")
        for address in replacements_or_deletes:
            print("PLAN BLOCKER: destructive action proposed for " + address)
        require(not replacements_or_deletes,
                "destructive plan requires manual review; no Apply attempted")


def main():
    print("PROD EC2 IAM ROLE — SAFE TAINT RECOVERY (NO INFRASTRUCTURE APPLY)")
    lineage = verify_role_and_state()
    terraform("init", "-input=false", "-reconfigure",
              "-backend-config=bucket=" + BUCKET,
              "-backend-config=key=" + STATE_KEY,
              "-backend-config=region=" + STATE_REGION,
              "-backend-config=encrypt=true",
              "-backend-config=use_lockfile=true")
    backup_remote_state()
    terraform("untaint", "-lock-timeout=120s", ADDRESS)
    verify_after(lineage)
    validate_plan()
    print("RECOVERY VERIFIED: no resource replacements; production Apply NOT performed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
