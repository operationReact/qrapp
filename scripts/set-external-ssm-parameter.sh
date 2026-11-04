#!/usr/bin/env bash
# Store an external credential without putting the secret in a shell argument,
# shell history, GitHub workflow log, Terraform plan or Terraform state.
set -euo pipefail
ENVIRONMENT="${1:?Usage: $0 dev|prod relative/parameter/path [region]}"
RELATIVE_PATH="${2:?Usage: $0 dev|prod relative/parameter/path [region]}"
REGION="${3:-ap-south-1}"
EXPECTED_ACCOUNT="${EXPECTED_AWS_ACCOUNT_ID:?Set EXPECTED_AWS_ACCOUNT_ID to the new 12-digit account ID}"
[[ "$EXPECTED_ACCOUNT" =~ ^[0-9]{12}$ ]] || { echo "Invalid new AWS account ID" >&2; exit 2; }
[[ "$REGION" == "ap-south-1" ]] || { echo "Refusing to configure secrets outside Mumbai" >&2; exit 2; }
ACTUAL_ACCOUNT="$(aws sts get-caller-identity --query Account --output text --region "$REGION")"
[[ "$ACTUAL_ACCOUNT" == "$EXPECTED_ACCOUNT" ]] || {
  echo "Refusing to modify secrets in AWS account $ACTUAL_ACCOUNT (expected $EXPECTED_ACCOUNT)" >&2
  exit 1
}
[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || exit 2
case "$RELATIVE_PATH" in
  openai/apiKey|razorpay/key|razorpay/secret|razorpay/webhookSecret|whatsapp/webhookVerifyToken|whatsapp/appSecret|whatsapp/phoneNumberId|whatsapp/accessToken) ;;
  *) echo "Unrecognized external parameter path" >&2; exit 2 ;;
esac
umask 077
TEMP="$(mktemp)"
trap 'rm -f "$TEMP"' EXIT
printf 'Enter value for /broandbro/backend/%s/%s (hidden): ' "$ENVIRONMENT" "$RELATIVE_PATH" >&2
IFS= read -r -s VALUE
printf '\n' >&2
[[ -n "$VALUE" ]] || { echo "Empty values forbidden" >&2; exit 1; }
printf '%s' "$VALUE" > "$TEMP"
unset VALUE
aws ssm put-parameter \
  --name "/broandbro/backend/$ENVIRONMENT/$RELATIVE_PATH" \
  --type SecureString \
  --value "file://$TEMP" \
  --overwrite \
  --region "$REGION" \
  --output none
echo "Parameter updated (value not printed)."
