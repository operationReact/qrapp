#!/usr/bin/env bash
# Publish only new-account PREVIEW A alias/IP records into the currently
# authoritative old-account Route 53 zone. Never changes production aliases.
# Usage: ./scripts/publish-preview-dns.sh \
#   OLD_PROFILE NEW_PROFILE dev|prod OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID --execute
set -euo pipefail
OLD_PROFILE="${1:?Old account AWS CLI profile required}"
NEW_PROFILE="${2:?New account AWS CLI profile required}"
ENVIRONMENT="${3:?Environment dev or prod required}"
OLD_ZONE_ID="${4:?Old authoritative zone ID required}"
NEW_ZONE_ID="${5:?New Terraform-created zone ID required}"
EXPECTED_NEW_ACCOUNT="${6:?12-digit new account ID required}"
MODE="${7:---dry-run}"

[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || exit 2
[[ "$EXPECTED_NEW_ACCOUNT" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$MODE" == "--dry-run" || "$MODE" == "--execute" ]] || exit 2

OLD_ACCOUNT="$(aws --profile "$OLD_PROFILE" sts get-caller-identity --query Account --output text)"
NEW_ACCOUNT="$(aws --profile "$NEW_PROFILE" sts get-caller-identity --query Account --output text)"
[[ "$NEW_ACCOUNT" == "$EXPECTED_NEW_ACCOUNT" && "$OLD_ACCOUNT" != "$NEW_ACCOUNT" ]] || {
  echo "Refusing same-account or identity mismatch" >&2; exit 1;
}
for ITEM in "$OLD_ZONE_ID:$OLD_PROFILE" "$NEW_ZONE_ID:$NEW_PROFILE"; do
  ZONE="${ITEM%%:*}"
  PROFILE="${ITEM#*:}"
  NAME="$(aws --profile "$PROFILE" route53 get-hosted-zone --id "$ZONE" --query 'HostedZone.Name' --output text)"
  [[ "$NAME" == "broandbro.in." ]] || { echo "Unexpected zone name $NAME" >&2; exit 1; }
done

FRONTEND="migrate-${ENVIRONMENT}.broandbro.in."
API="migrate-${ENVIRONMENT}-api.broandbro.in."
TMP_NEW="$(mktemp)"
TMP_OLD="$(mktemp)"
TMP_BATCH="$(mktemp)"
trap 'rm -f "$TMP_NEW" "$TMP_OLD" "$TMP_BATCH"' EXIT

aws --profile "$NEW_PROFILE" route53 list-resource-record-sets \
  --hosted-zone-id "$NEW_ZONE_ID" > "$TMP_NEW"
aws --profile "$OLD_PROFILE" route53 list-resource-record-sets \
  --hosted-zone-id "$OLD_ZONE_ID" > "$TMP_OLD"

# Expect EXACTLY two A record sets: preview frontend and preview API.
jq -e --arg frontend "$FRONTEND" --arg api "$API" '
  [.ResourceRecordSets[] | select(
    .Type == "A" and (.Name == $frontend or .Name == $api)
  )] | select(length == 2)
' "$TMP_NEW" >/dev/null || {
  echo "Both preview A records must exist in the new zone before publishing" >&2; exit 1;
}

# Safety: refuse to overwrite a preview hostname if already used in old DNS,
# unless the record sets match exactly.
jq -e --arg frontend "$FRONTEND" --arg api "$API" '
  [.ResourceRecordSets[] | select(.Name == $frontend or .Name == $api)] | length
' "$TMP_OLD" > /dev/null

OLD_CONFLICTS="$(jq --slurpfile new "$TMP_NEW" --arg frontend "$FRONTEND" --arg api "$API" '
  [.ResourceRecordSets[] | select(.Name == $frontend or .Name == $api) |
    . as $current |
    select(([ $new[0].ResourceRecordSets[] |
      select(.Name == $current.Name and .Type == $current.Type and . == $current)
    ] | length) == 0)] | length
' "$TMP_OLD")"
[[ "$OLD_CONFLICTS" == "0" ]] || {
  echo "Existing records at preview hostnames differ; refusing to overwrite" >&2
  exit 1
}

jq -e --arg frontend "$FRONTEND" --arg api "$API" '{
  Comment: "Temporary new-account preview A records; original production DNS untouched",
  Changes: [.ResourceRecordSets[] | select(
    .Type == "A" and (.Name == $frontend or .Name == $api)
  ) | {Action: "UPSERT", ResourceRecordSet: .}]
}' "$TMP_NEW" > "$TMP_BATCH"

echo "Validated preview records for $FRONTEND and $API"
if [[ "$MODE" == "--dry-run" ]]; then
  echo "DRY RUN: would add ONLY these two A records in existing old authoritative DNS."
  exit 0
fi
aws --profile "$OLD_PROFILE" route53 change-resource-record-sets \
  --hosted-zone-id "$OLD_ZONE_ID" --change-batch "file://$TMP_BATCH" >/dev/null
echo "Preview DNS published. Existing production aliases unchanged."
