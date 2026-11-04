#!/usr/bin/env python3
"""Read-only post-Terraform AWS migration preflight.

Usage:
  AWS_PROFILE=broandbro-new python3 scripts/preflight-new-account.py \
      --environment dev --account 123456789012
  # Outside dev opening hours:
  ... --environment dev --account 123456789012 --allow-stopped

No AWS mutations, secret values printed, or local credentials written.
"""
import argparse
import json
import re
import subprocess
import sys

REGION = "ap-south-1"


class CheckFailure(Exception):
    pass


def aws(service, action, *args):
    cmd = ["aws", service, action, *args, "--region", REGION, "--output", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode:
        # CLI stderr sometimes contains resource IDs; never print API response bodies.
        raise CheckFailure(f"{service}:{action} failed (CLI exit {result.returncode})")
    try:
        return json.loads(result.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise CheckFailure(f"{service}:{action} returned invalid JSON") from exc


def require(condition, message):
    if not condition:
        raise CheckFailure(message)


def is_public(permission):
    """Whether a security-group rule has unrestricted IPv4 or IPv6 CIDR sources."""
    return (
        any(x.get("CidrIp") == "0.0.0.0/0" for x in permission.get("IpRanges", []))
        or any(x.get("CidrIpv6") == "::/0" for x in permission.get("Ipv6Ranges", []))
    )


def exposes_public_ssh(permission):
    """TCP/22 (or all protocols) from the public internet is forbidden."""
    if not is_public(permission):
        return False
    if permission.get("IpProtocol") == "-1":
        return True
    if permission.get("IpProtocol") not in ("tcp", "6"):
        return False
    return permission.get("FromPort", -1) <= 22 <= permission.get("ToPort", 65535)


def approved_database_ingress(permission, backend_sg_ids):
    """RDS allows PostgreSQL only from an EC2 backend SG, never any other source."""
    return (
        permission.get("IpProtocol") in ("tcp", "6")
        and permission.get("FromPort") == 5432
        and permission.get("ToPort") == 5432
        and not permission.get("IpRanges")
        and not permission.get("Ipv6Ranges")
        and not permission.get("PrefixListIds")
        and bool(permission.get("UserIdGroupPairs"))
        and all(group.get("GroupId") in backend_sg_ids
                for group in permission["UserIdGroupPairs"])
    )


def get_ssm_parameter(name):
    result = aws("ssm", "get-parameter", "--name", name)
    return result["Parameter"]["Value"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=("dev", "prod"), required=True)
    parser.add_argument("--account", required=True)
    parser.add_argument("--allow-stopped", action="store_true",
                        help="Allow stopped EC2 and RDS outside dev schedule")
    opts = parser.parse_args()

    require(re.fullmatch(r"\d{12}", opts.account), "Expected a 12-digit AWS account ID")
    require(not opts.allow_stopped or opts.environment == "dev",
            "--allow-stopped is supported only in development")

    # This is the FIRST AWS operation. A wrong identity blocks every other read.
    caller = aws("sts", "get-caller-identity")
    require(caller.get("Account") == opts.account,
            "Authenticated identity is NOT the expected new AWS account")
    env = opts.environment
    account = opts.account
    frontend_bucket = f"broandbro-{env}-ui-{account}"
    artifact_bucket = f"broandbro-{env}-artifacts-{account}"
    media_bucket = f"broandbro-{env}-media-{account}"
    location_bucket = f"broandbro-{env}-locations-{account}"
    api_host = f"migrate-{env}-api.broandbro.in"
    frontend_host = f"migrate-{env}.broandbro.in"
    base = f"/broandbro/backend/{env}"
    checks = []

    def check(title, fn):
        try:
            fn()
            checks.append((title, "PASS"))
            print(f"[PASS] {title}")
        except (CheckFailure, KeyError, IndexError, ValueError) as exc:
            checks.append((title, "FAIL"))
            print(f"[FAIL] {title}: {exc}", file=sys.stderr)

    def check_parameters():
        vals = {
            key: get_ssm_parameter(f"{base}/{key}")
            for key in (
                "database/url", "database/username", "database/secretArn",
                "aws/s3/bucketName", "aws/s3/locationBucketName",
                "aws/s3/artifactBucketName", "aws/s3/region", "aws/s3/enabled",
                "app/api/domain", "app/cors/allowedOrigins"
            )
        }
        require(vals["database/url"].startswith("jdbc:postgresql://"),
                "Database JDBC URL not generated")
        require(vals["database/username"] not in ("", "None"),
                "Database username unset")
        require(vals["database/secretArn"].startswith(
            f"arn:aws:secretsmanager:{REGION}:{account}:secret:"),
            "Database secret ARN belongs to unexpected account")
        require(vals["aws/s3/bucketName"] == media_bucket,
                "Unexpected media bucket name")
        require(vals["aws/s3/locationBucketName"] == location_bucket,
                "Unexpected location bucket name")
        require(vals["aws/s3/artifactBucketName"] == artifact_bucket,
                "Unexpected artifact bucket name")
        require(vals["aws/s3/region"] == REGION, "S3 region mismatch")
        require(vals["aws/s3/enabled"].lower() == "true", "S3 is disabled")
        require(vals["app/api/domain"] == api_host, "API preview hostname mismatch")
        require(f"https://{frontend_host}" in vals["app/cors/allowedOrigins"].split(","),
                "Frontend preview domain missing from allowed CORS origins")
        # Read metadata ONLY; do not fetch or expose the RDS password.
        result = aws("secretsmanager", "describe-secret",
                     "--secret-id", vals["database/secretArn"])
        require(not result.get("DeletedDate"), "DB master secret is scheduled for deletion")

    def check_rds():
        data = aws("rds", "describe-db-instances",
                   "--db-instance-identifier", f"broandbro-{env}")
        instances = data["DBInstances"]
        require(len(instances) == 1, "Expected one RDS instance")
        db = instances[0]
        require(not db["PubliclyAccessible"], "Database is publicly exposed")
        require(db["StorageEncrypted"], "Database storage is not encrypted")
        if env == "prod":
            require(db["DeletionProtection"], "Production DB deletion protection disabled")
        status = db["DBInstanceStatus"]
        accepted = ("available", "stopped") if opts.allow_stopped else ("available",)
        require(status in accepted, f"Unexpected database state: {status}")

        # A database marked non-public can still be reachable from unintended
        # networks (e.g. peering or a public subnet). Verify the attached rules.
        backend_groups = aws(
            "ec2", "describe-security-groups", "--filters",
            f"Name=group-name,Values=broandbro-{env}-ec2-sg"
        )["SecurityGroups"]
        require(len(backend_groups) == 1, "Backend security group missing or ambiguous")
        permitted_ids = {backend_groups[0]["GroupId"]}
        db_group_ids = [g["VpcSecurityGroupId"]
                        for g in db.get("VpcSecurityGroups", [])]
        require(bool(db_group_ids), "RDS has no security group")
        db_groups = aws("ec2", "describe-security-groups",
                        "--group-ids", *db_group_ids)["SecurityGroups"]
        require(len(db_groups) == len(db_group_ids), "Could not inspect all RDS groups")
        inbound = [p for group in db_groups for p in group.get("IpPermissions", [])]
        require(bool(inbound), "RDS has no approved PostgreSQL ingress")
        for rule in inbound:
            require(approved_database_ingress(rule, permitted_ids),
                    "RDS inbound security-group rule is broader than PostgreSQL from backend EC2")

    def check_ec2():
        data = aws("ec2", "describe-instances",
                   "--filters", f"Name=tag:Name,Values=broandbro-{env}-backend",
                   "Name=instance-state-name,Values=running,stopped")
        instances = [inst for reservation in data.get("Reservations", [])
                     for inst in reservation.get("Instances", [])]
        require(len(instances) == 1, "Expected one backend EC2 instance")
        instance = instances[0]
        status = instance["State"]["Name"]
        accepted = ("running", "stopped") if opts.allow_stopped else ("running",)
        require(status in accepted, f"Unexpected instance state: {status}")
        groups = [g["GroupId"] for g in instance["SecurityGroups"]]
        security = aws("ec2", "describe-security-groups", "--group-ids", *groups)
        for sg in security["SecurityGroups"]:
            for permission in sg.get("IpPermissions", []):
                require(not exposes_public_ssh(permission),
                        "Public SSH or all-port ingress detected (IPv4/IPv6)")
        if status == "running":
            managed = aws("ssm", "describe-instance-information",
                          "--filters", f"Key=InstanceIds,Values={instance['InstanceId']}")
            nodes = managed.get("InstanceInformationList", [])
            require(len(nodes) == 1 and nodes[0]["PingStatus"] == "Online",
                    "SSM agent is not online")

    def check_private_buckets():
        for bucket in (frontend_bucket, artifact_bucket):
            config = aws("s3api", "get-public-access-block", "--bucket", bucket)
            block = config["PublicAccessBlockConfiguration"]
            require(all(block.get(field) is True for field in (
                "BlockPublicAcls", "IgnorePublicAcls",
                "BlockPublicPolicy", "RestrictPublicBuckets"
            )), f"Private bucket protections incomplete: {bucket}")

    def check_cloudfront():
        distribution_id = get_ssm_parameter(f"/broandbro/{env}/cf-distribution-id")
        require(re.fullmatch(r"[A-Z0-9]+", distribution_id),
                "Invalid CloudFront distribution ID")
        data = aws("cloudfront", "get-distribution", "--id", distribution_id)
        dist = data["Distribution"]
        require(dist["DistributionConfig"]["Enabled"], "CloudFront is disabled")
        aliases = dist["DistributionConfig"]["Aliases"].get("Items", [])
        require(frontend_host in aliases, "Preview CloudFront alias missing")

    check("Generated SSM parameters and RDS secret ARN", check_parameters)
    check("Private, encrypted RDS instance", check_rds)
    check("EC2 isolation and SSM readiness", check_ec2)
    check("Private frontend and artifact storage", check_private_buckets)
    check("CloudFront preview distribution", check_cloudfront)
    failures = sum(result == "FAIL" for _, result in checks)
    print(f"Migration preflight: {len(checks) - failures}/{len(checks)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (CheckFailure, KeyError, ValueError) as err:
        print(f"Preflight refused to run: {err}", file=sys.stderr)
        sys.exit(1)
