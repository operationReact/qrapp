#!/usr/bin/env bash
# PRE-CUTOVER ACM validation: create a new-account cert via Terraform, then
# automate ONLY its DNS validation CNAME records in the old authoritative zone.
# This does NOT move public DNS aliases, modify the registrar or deploy apps.
#
# Usage: ./scripts/prepare-acm-validation.sh \
#   OLD_AWS_PROFILE NEW_AWS_PROFILE dev|prod OLD_ZONE_ID NEW_ACCOUNT_ID --execute
#
# Required: Terraform 1.12+, AWS CLI, jq, old-zone write permission, new-account
# provisioning permission. Initial new account bootstrap must already be done.
set -euo pipefail
OLD_PROFILE="${1:?old AWS profile required}"
NEW_PROFILE="${2:?new AWS profile required}"
ENVIRONMENT="${3:?dev or prod required}"
OLD_ZONE_ID="${4:?current authoritative hosted zone ID required}"
EXPECTED_NEW_ACCOUNT="${5:?new 12-digit AWS account ID required}"
MODE="${6:---dry-run}"
REGION="us-east-1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || { echo "Invalid environment" >&2; exit 2; }
[[ "$EXPECTED_NEW_ACCOUNT" =~ ^[0-9]{12}$ ]] || { echo "Invalid new-account ID" >&2; exit 2; }
[[ "$MODE" == "--dry-run" || "$MODE" == "--execute" ]] || { echo "Use --dry-run or --execute" >&2; exit 2; }

OLD_ACCOUNT="$(aws --profile "$OLD_PROFILE" sts get-caller-identity --query Account --output text)"
NEW_ACCOUNT="$(aws --profile "$NEW_PROFILE" sts get-caller-identity --query Account --output text)"
[[ "$NEW_ACCOUNT" == "$EXPECTED_NEW_ACCOUNT" && "$OLD_ACCOUNT" != "$NEW_ACCOUNT" ]] || {
  echo "::error::Refusing account mismatch or same source/destination account" >&2; exit 1;
}
OLD_ZONE_NAME="$(aws --profile "$OLD_PROFILE" route53 get-hosted-zone --id "$OLD_ZONE_ID" --query 'HostedZone.Name' --output text)"
[[ "$OLD_ZONE_NAME" == "broandbro.in." ]] || {
  echo "Old zone ID does not resolve to broandbro.in.; refusing" >&2; exit 1;
}
echo "Old zone: $OLD_ZONE_NAME (account $OLD_ACCOUNT)"
echo "New account: $NEW_ACCOUNT; environment: $ENVIRONMENT"
echo "This step never modifies existing application A/AAAA/ALIAS records."
if [[ "$MODE" == "--dry-run" ]]; then
  echo "DRY RUN. No Terraform apply, no DNS modifications."
  echo "On --execute: provision ACM cert and new-zone validation records via Terraform,"
  echo "then copy only the CNAME validation records to old authoritative zone."
  exit 0
fi

STATE_BUCKET="broandbro-tfstate-${NEW_ACCOUNT}-${REGION}"
STACK="$ROOT/infra/environments/$ENVIRONMENT"
export AWS_PROFILE="$NEW_PROFILE"
export AWS_REGION="$REGION"
export TF_VAR_expected_account_id="$NEW_ACCOUNT"

terraform -chdir="$STACK" init -input=false -reconfigure \
  -backend-config="bucket=$STATE_BUCKET" \
  -backend-config="key=env/$ENVIRONMENT/terraform.tfstate" \
  -backend-config="region=$REGION" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"

# The narrowly targeted one-time apply is necessary because a normal
# certificate_validation resource waits for PUBLIC DNS resolution.
# Full application infrastructure is applied later through guarded CI.
terraform -chdir="$STACK" apply -input=false -auto-approve \
  -target='module.acm.aws_acm_certificate.this' \
  -target='module.acm.aws_route53_record.validation'

CERT_ARN="$(terraform -chdir="$STACK" output -raw acm_certificate_arn)"
[[ "$CERT_ARN" == arn:aws:acm:us-east-1:${NEW_ACCOUNT}:certificate/* ]] || {
  echo "Unexpected certificate ARN in Terraform outputs" >&2; exit 1;
}
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
aws --profile "$NEW_PROFILE" acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" |
  jq -e '{
    Comment: "New-account certificate validation; do not modify production routing",
    Changes: ([.Certificate.DomainValidationOptions[] |
      select(.ResourceRecord != null) |
      {Action:"UPSERT", ResourceRecordSet: {
        Name: .ResourceRecord.Name,
        Type: .ResourceRecord.Type,
        TTL: 60,
        ResourceRecords: [{Value: .ResourceRecord.Value}]
      }}
    ] | unique_by(.ResourceRecordSet.Name))
  } | select(.Changes | length > 0)' > "$TMP"

# Only validation CNAMEs with _-prefixed labels, no A/MX/NS/TXT edits.
jq -e 'all(.Changes[];
  (.ResourceRecordSet.Type == "CNAME") and
  (.ResourceRecordSet.Name | startswith("_")) and
  (.ResourceRecordSet.Name | endswith(".broandbro.in."))
)' "$TMP" >/dev/null

aws --profile "$OLD_PROFILE" route53 change-resource-record-sets \
  --hosted-zone-id "$OLD_ZONE_ID" \
  --change-batch "file://$TMP" >/dev/null
echo "ACM validation CNAMEs copied into current authoritative DNS."
echo "Certificate ARN: $CERT_ARN"
echo "Wait for ACM status ISSUED, then use the new-account Terraform plan/apply."
echo "Original app aliases and old account infrastructure remain unchanged."
