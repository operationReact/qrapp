#!/bin/bash

# AWS SSM Parameter Store - Create Sign in with Apple parameters
#
# Creates the two parameters the backend reads for Sign in with Apple:
#   /broandbro/backend/<env>/apple/clientIds   -> app.parameter-store.apple.clientIds -> app.apple.client-ids
#   /broandbro/backend/<env>/apple/redirectUri -> app.parameter-store.apple.redirectUri -> app.apple.redirect-uri
#
# SAFE / IDEMPOTENT: existing parameters are left untouched (so running this
# again never overwrites the real values you set later). Seeds a non-activating
# placeholder ("REPLACE_ME") so the feature stays DISABLED in production until a
# real reverse-DNS client id is set — the backend only enables Apple sign-in for
# a client id that contains a dot (e.g. in.broandbro.signin).
#
# Usage:
#   ./scripts/create-apple-ssm-parameters.sh dev
#   ./scripts/create-apple-ssm-parameters.sh prod
#   APPLE_CLIENT_IDS="in.broandbro.signin,in.broandbro.app" \
#   APPLE_REDIRECT_URI="https://www.broandbro.in/login" \
#     ./scripts/create-apple-ssm-parameters.sh prod   # create directly with real values
#
# Run where your real AWS credentials are configured (your machine / deploy host
# with SSM write permission). Region must match the backend's AWS_REGION.

set -euo pipefail

ENVIRONMENT="${1:?Usage: $0 dev|prod [region]}"
REGION="${2:-${AWS_REGION:-us-east-1}}"
[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || {
  echo "Environment must be 'dev' or 'prod'" >&2; exit 2;
}
PREFIX="/broandbro/backend/${ENVIRONMENT}"

CLIENT_IDS_VALUE="${APPLE_CLIENT_IDS:-REPLACE_ME}"
REDIRECT_URI_VALUE="${APPLE_REDIRECT_URI:-REPLACE_ME}"

echo "════════════════════════════════════════════════════════════════"
echo "🍏 Sign in with Apple — SSM parameters"
echo "Environment: $ENVIRONMENT | Region: $REGION"
echo "Account:     $(aws sts get-caller-identity --query Account --output text --region "$REGION")"
echo "════════════════════════════════════════════════════════════════"

# Create only if the parameter does not already exist (never clobber real values).
create_if_absent() {
  local name="$1" value="$2"
  if aws ssm get-parameter --name "$name" --region "$REGION" >/dev/null 2>&1; then
    echo "⏭️  Skipping (already exists): $name"
    return 0
  fi
  aws ssm put-parameter \
    --name "$name" \
    --value "$value" \
    --type String \
    --region "$REGION" \
    --output none
  echo "✅ Created: $name = $value"
}

create_if_absent "$PREFIX/apple/clientIds" "$CLIENT_IDS_VALUE"
create_if_absent "$PREFIX/apple/redirectUri" "$REDIRECT_URI_VALUE"

echo ""
echo "Done. To go live later, set the real values (feature activates automatically):"
echo "  aws ssm put-parameter --name $PREFIX/apple/clientIds \\"
echo "    --value 'in.broandbro.signin,in.broandbro.app' --type String --overwrite --region $REGION"
echo "  aws ssm put-parameter --name $PREFIX/apple/redirectUri \\"
echo "    --value 'https://www.broandbro.in/login' --type String --overwrite --region $REGION"
echo "Then restart the backend so it re-reads Parameter Store."
