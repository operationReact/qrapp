#!/usr/bin/env bash
# Safely mirror existing authoritative DNS records into the Terraform-created
# replacement zone, without altering the old DNS zone or registrar delegation.
# Usage: ./scripts/mirror-route53-records.sh old-sso new-sso OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID
set -euo pipefail

OLD_PROFILE="${1:?old profile required}"
NEW_PROFILE="${2:?new profile required}"
OLD_ZONE="${3:?old hosted zone ID required}"
NEW_ZONE="${4:?new hosted zone ID required}"
NEW_ACCOUNT="${5:?new account ID required}"
MODE="${6:---dry-run}"
[[ "$NEW_ACCOUNT" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$MODE" == "--dry-run" || "$MODE" == "--execute" ]] || exit 2
[[ "$(aws --profile "$NEW_PROFILE" sts get-caller-identity --query Account --output text)" == "$NEW_ACCOUNT" ]] || exit 1
umask 077
RAW="$(mktemp)"
trap 'rm -f "$RAW"' EXIT
aws --profile "$OLD_PROFILE" route53 list-resource-record-sets --hosted-zone-id "$OLD_ZONE" > "$RAW"
COUNT="$(jq '[.ResourceRecordSets[] | select(.Type!="SOA" and .Type!="NS")] | length' "$RAW")"
echo "Found $COUNT transferable DNS record sets; SOA/NS zone records excluded."
[[ "$MODE" == "--execute" ]] || { echo "Dry run only. Re-run with --execute to apply UPSERT to new zone."; exit 0; }
jq -c '[.ResourceRecordSets[] | select(.Type!="SOA" and .Type!="NS") | {Action:"UPSERT",ResourceRecordSet:.}] | . as $records | [range(0;length;100) as $i | {Changes: $records[$i:$i+100]}] | .[]' "$RAW" |
while IFS= read -r BATCH; do
  CHANGE_FILE="$(mktemp)"
  printf '%s' "$BATCH" > "$CHANGE_FILE"
  aws --profile "$NEW_PROFILE" route53 change-resource-record-sets \
    --hosted-zone-id "$NEW_ZONE" --change-batch "file://$CHANGE_FILE" >/dev/null
  rm -f "$CHANGE_FILE"
done
echo "New zone populated. Verify records before changing nameservers at the registrar."
