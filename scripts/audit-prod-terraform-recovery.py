#!/usr/bin/env python3
"""Read-only inventory of a *partially failed* production Terraform Apply.

No Terraform writes, lock release, resource deletion, or state download.
Do not mistake a successful inventory for permission to rerun Apply.
"""
import json
import subprocess

ACCOUNT = "098859530205"
REGION = "ap-south-1"
BUCKET = "broandbro-tfstate-098859530205-ap-south-1"
STATE = "env/prod/terraform.tfstate"
LOCK = STATE + ".tflock"


def aws(*args, region=REGION):
    proc = subprocess.run(
        ["aws", *args, "--region", region, "--output", "json"],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode:
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None


def result(label, status, message=""):
    print(f"{label}: {status}" + (f" ({message})" if message else ""))


def main():
    identity = aws("sts", "get-caller-identity")
    if identity is None or identity.get("Account") != ACCOUNT:
        result("ACCOUNT GUARD", "FAILED", "Wrong account or unreadable caller identity")
        return 2
    result("ACCOUNT GUARD", "PASS", ACCOUNT)

    listing = aws("s3api", "list-objects-v2", "--bucket", BUCKET,
                  "--expected-bucket-owner", ACCOUNT, "--prefix", "env/prod/",
                  region="us-east-1")
    if listing is None:
        result("REMOTE STATE", "UNKNOWN", "Cannot inspect state bucket")
    else:
        objects = {i["Key"] for i in listing.get("Contents", [])}
        result("REMOTE STATE", "PRESENT" if STATE in objects else "MISSING",
               "metadata only; contents deliberately not read")
        result("STATE LOCK", "PRESENT - VERIFY OWNER BEFORE UNLOCK" if LOCK in objects
               else "NOT LISTED")
        versions = aws("s3api", "list-object-versions", "--bucket", BUCKET,
                       "--expected-bucket-owner", ACCOUNT,
                       "--prefix", STATE, region="us-east-1")
        if versions is not None:
            count = sum(1 for v in versions.get("Versions", []) if v.get("Key") == STATE)
            result("REMOTE STATE VERSIONS", str(count),
                   "Review latest and previous S3 object versions before recovery")

    for label, check in (
        ("PROD VPC", ("ec2", "describe-vpcs", "--vpc-ids", "vpc-08ccb73b6c8b42ead")),
        ("PROD BACKEND EC2", ("ec2", "describe-instances", "--filters",
                              "Name=tag:Name,Values=broandbro-prod-backend")),
        ("PROD RDS DB", ("rds", "describe-db-instances", "--db-instance-identifier", "broandbro-prod")),
        ("PROD IAM ROLE", ("iam", "get-role", "--role-name", "broandbro-prod-ec2-role")),
    ):
        value = aws(*check)
        if value is None:
            result(label, "NOT VERIFIED", "Absent or read denied; inspect AWS console")
        elif label == "PROD BACKEND EC2":
            instances = [v for group in value.get("Reservations", []) for v in group.get("Instances", [])]
            states = sorted({v.get("State", {}).get("Name", "unknown") for v in instances})
            result(label, "FOUND" if instances else "ABSENT",
                   f"{len(instances)} instances, states={','.join(states)}")
        elif label == "PROD RDS DB":
            dbs = value.get("DBInstances", [])
            result(label, "FOUND" if dbs else "ABSENT",
                   ", ".join(d.get("DBInstanceStatus", "unknown") for d in dbs))
        else:
            result(label, "FOUND")

    for suffix in ("ui", "media", "locations", "artifacts"):
        name = f"broandbro-prod-{suffix}-{ACCOUNT}"
        head = subprocess.run(["aws", "s3api", "head-bucket", "--bucket", name,
                              "--expected-bucket-owner", ACCOUNT],
                              capture_output=True, text=True, check=False)
        result("S3 " + suffix.upper(), "FOUND" if head.returncode == 0
               else "NOT VERIFIED", name)

    role = aws("iam", "get-role", "--role-name", "broandbro-prod-terraform-github")
    if role:
        duration = role.get("Role", {}).get("MaxSessionDuration")
        result("OIDC SESSION LIMIT", str(duration) + "s" if duration else "UNKNOWN",
               "Previous Apply expired after one hour")
    policy = aws("iam", "get-role-policy", "--role-name", "broandbro-prod-terraform-github",
                 "--policy-name", "broandbro-prod-terraform-provision")
    if policy:
        statements = policy.get("PolicyDocument", {}).get("Statement", [])
        actions = {a.lower() for s in statements if s.get("Effect") == "Allow"
                   for a in ([s.get("Action")] if isinstance(s.get("Action"), str)
                             else s.get("Action", []))}
        result("IAM ListRolePolicies", "POLICY DECLARED" if "iam:listrolepolicies" in actions
               else "MISSING FROM POLICY")
        result("IAM CreateServiceLinkedRole", "POLICY DECLARED" if "iam:createservicelinkedrole" in actions
               else "MISSING FROM POLICY")

    zone = aws("route53", "get-hosted-zone", "--id", "Z01289103E8MGUM73FENK")
    if zone:
        target = set(n.lower().rstrip(".") for n in zone.get("DelegationSet", {}).get("NameServers", []))
        dns = subprocess.run(["dig", "+short", "NS", "broandbro.in"],
                             capture_output=True, text=True, check=False)
        public = set(n.lower().rstrip(".") for n in dns.stdout.splitlines() if n.strip())
        if public and target:
            result("ACM DNS DELEGATION",
                   "MATCH" if public == target else "DIFFERENT / VALIDATION CNAME MUST BE PUBLISHED IN AUTHORITATIVE DNS",
                   "public NS=" + ",".join(sorted(public)) +
                   "; new-account zone NS=" + ",".join(sorted(target)))
        else:
            result("ACM DNS DELEGATION", "UNKNOWN", "Public NS lookup unavailable")

    certs = aws("acm", "list-certificates", "--certificate-statuses",
                "PENDING_VALIDATION", "ISSUED", "INACTIVE", region="us-east-1")
    if certs:
        matches = [c for c in certs.get("CertificateSummaryList", [])
                   if c.get("DomainName") == "broandbro.in"]
        for cert in matches:
            result("ACM broandbro.in", cert.get("Status", "UNKNOWN"))
    print("RECOVERY REQUIRED: This is metadata-only evidence; Terraform state and live AWS")
    print("resources must be reconciled before any new Plan/Apply or lock release.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
