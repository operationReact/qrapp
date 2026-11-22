#!/usr/bin/env python3
"""Read-only SSM readiness audit for Bro & Bro's new-account production launch.

Only parameter *status* and names are printed. Secret values and AWS stderr
are never logged. Requires an authenticated identity in the target AWS account.
"""
import json
import re
import subprocess
import sys

ACCOUNT = "098859530205"
REGION = "ap-south-1"
BASE = "/broandbro/backend/prod/"
PLACEHOLDERS = {"", "None", "null", "MISSING_EXTERNAL_CREDENTIAL"}

EXTERNAL = [
    ("razorpay/key", True),
    ("razorpay/secret", True),
    ("razorpay/webhookSecret", True),
    ("whatsapp/accessToken", True),
    ("whatsapp/appSecret", True),
    ("whatsapp/phoneNumberId", True),
    ("whatsapp/webhookVerifyToken", True),
    ("openai/apiKey", False),
]
GENERATED = [
    ("aws/s3/bucketName", "broandbro-prod-media-" + ACCOUNT),
    ("aws/s3/locationBucketName", "broandbro-prod-locations-" + ACCOUNT),
    ("aws/s3/artifactBucketName", "broandbro-prod-artifacts-" + ACCOUNT),
    ("aws/s3/region", REGION),
    ("aws/s3/enabled", "true"),
    ("app/api/domain", "migrate-prod-api.broandbro.in"),
    ("app/cors/allowedOrigins", "https://migrate-prod.broandbro.in"),
]
DATABASE = ["database/url", "database/username", "database/secretArn"]
# Direct EC2 frontend requires no CloudFront distribution ID.
INFRA = ["/broandbro/prod/ec2-public-ip"]
OPTIONAL_CLOUDFRONT = "/broandbro/prod/cf-distribution-id"


def aws_json(*args):
    p = subprocess.run(
        ["aws", *args, "--region", REGION, "--output", "json"],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if p.returncode != 0:
        raise RuntimeError("AWS command unsuccessful; inspect role permissions or resource state")
    return json.loads(p.stdout)


def get_value(name):
    try:
        return aws_json("ssm", "get-parameter", "--name", name,
                        "--with-decryption")["Parameter"]["Value"]
    except (RuntimeError, KeyError, ValueError):
        return None


def acceptable(name, value, expected=None):
    if not isinstance(value, str) or value.strip() in PLACEHOLDERS:
        return False
    if expected is not None:
        return value == expected
    if name.endswith("/database/url"):
        return value.startswith("jdbc:postgresql://") and "/broandbro" in value
    if name.endswith("/database/username"):
        return value == "broandbro"
    if name.endswith("/database/secretArn"):
        return value.startswith("arn:aws:secretsmanager:" + REGION + ":" + ACCOUNT + ":secret:")
    if name.endswith("/cf-distribution-id"):
        return re.fullmatch(r"[A-Z0-9]{8,20}", value) is not None
    if name.endswith("/ec2-public-ip"):
        return re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}", value) is not None
    return True


def main():
    # Identity validation takes place BEFORE touching SSM.
    try:
        identity = aws_json("sts", "get-caller-identity")
    except (RuntimeError, ValueError) as exc:
        print("FAIL: AWS identity check did not complete (details suppressed)")
        return 2
    if identity.get("Account") != ACCOUNT:
        print("FAIL: AWS identity does not match approved production account")
        return 2

    failures = 0
    required = 0
    optional_ok = 0
    print("Bro & Bro PROD SSM readiness — read-only, values hidden")
    for suffix, mandatory in EXTERNAL:
        name = BASE + suffix
        ok = acceptable(name, get_value(name))
        if mandatory:
            required += 1
            failures += not ok
            status = "READY" if ok else "MISSING / PLACEHOLDER / UNREADABLE"
        else:
            optional_ok += ok
            status = "READY" if ok else "OPTIONAL NOT CONFIGURED"
        print(f"{status}: {name}")

    for suffix, expected in GENERATED:
        name = BASE + suffix
        required += 1
        ok = acceptable(name, get_value(name), expected=expected)
        failures += not ok
        print(f"{'READY' if ok else 'MISSING / INVALID / UNREADABLE'}: {name}")

    for suffix in DATABASE:
        name = BASE + suffix
        required += 1
        ok = acceptable(name, get_value(name))
        failures += not ok
        print(f"{'READY' if ok else 'MISSING / INVALID / UNREADABLE'}: {name}")

    for name in INFRA:
        required += 1
        ok = acceptable(name, get_value(name))
        failures += not ok
        print(f"{'READY' if ok else 'MISSING / INVALID / UNREADABLE'}: {name}")

    cf_ready = acceptable(OPTIONAL_CLOUDFRONT, get_value(OPTIONAL_CLOUDFRONT))
    print(f"{'OPTIONAL READY' if cf_ready else 'OPTIONAL NOT CONFIGURED'}: {OPTIONAL_CLOUDFRONT}")
    print(f"Required checks: {required - failures}/{required} ready; optional OpenAI: {optional_ok}/1.")
    if failures:
        print("BLOCKER: Do not deploy backend until all required parameters are ready.")
    else:
        print("SSM preflight passed. Live vendor API functionality still requires smoke tests.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
