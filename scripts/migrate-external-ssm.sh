#!/usr/bin/env bash
# Explicit, opt-in cross-account transfer of EXTERNAL SSM secrets only.
# Terraform-generated parameters (DB URL, Secrets Manager ARN, bucket names, CF IDs)
# MUST NOT be copied: they are created from resources in the new account.
# Example: ./scripts/migrate-external-ssm.sh old-sso new-sso dev 123456789012 us-east-1 --execute
set -euo pipefail

OLD_PROFILE="${1:?Old AWS CLI profile required}"
NEW_PROFILE="${2:?New AWS CLI profile required}"
ENVIRONMENT="${3:?dev or prod required}"
NEW_ACCOUNT="${4:?Expected NEW 12-digit AWS account ID required}"
REGION="${5:-ap-south-1}"
ACTION="${6:---dry-run}"

[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || exit 2
[[ "$NEW_ACCOUNT" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$ACTION" == "--dry-run" || "$ACTION" == "--execute" ]] || exit 2

OLD_ID="$(aws --profile "$OLD_PROFILE" sts get-caller-identity --query Account --output text)"
NEW_ID="$(aws --profile "$NEW_PROFILE" sts get-caller-identity --query Account --output text)"
[[ "$NEW_ID" == "$NEW_ACCOUNT" && "$OLD_ID" != "$NEW_ID" ]] || {
  echo "Refusing unsafe profile/account combination" >&2
  exit 1
}
umask 077
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

PATHS=(
  "openai/apiKey"
  "razorpay/key"
  "razorpay/secret"
  "razorpay/webhookSecret"
  "whatsapp/webhookVerifyToken"
  "whatsapp/appSecret"
  "whatsapp/phoneNumberId"
  "whatsapp/accessToken"
)

for ITEM in "${PATHS[@]}"; do
  NAME="/broandbro/backend/$ENVIRONMENT/$ITEM"
  if ! aws --profile "$OLD_PROFILE" --region "$REGION" ssm get-parameter \
      --name "$NAME" --query 'Parameter.Name' --output text >/dev/null 2>&1; then
    echo "NOT FOUND in old account: $NAME"
    continue
  fi
  if [[ "$ACTION" == "--dry-run" ]]; then
    echo "WOULD COPY: $NAME (value omitted)"
    continue
  fi

  # Decrypt locally with an authorized source account session, NEVER print it.
  aws --profile "$OLD_PROFILE" --region "$REGION" ssm get-parameter \
    --name "$NAME" --with-decryption --query 'Parameter.Value' --output text > "$TMP"
  # Remove AWS CLI text output's final newline, not the credential's other bytes.
  python3 - "$TMP" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
v = p.read_bytes()
if v.endswith(b"\n"):
    p.write_bytes(v[:-1])
PY
  aws --profile "$NEW_PROFILE" --region "$REGION" ssm put-parameter \
    --name "$NAME" --type SecureString --overwrite \
    --value "file://$TMP" --output json >/dev/null
  : > "$TMP"
  echo "COPIED: $NAME (value omitted)"
done
echo "Do not copy generated parameters, Terraform state, database passwords or SSH private keys."
