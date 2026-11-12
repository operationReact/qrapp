#!/usr/bin/env bash
# Fail-closed gate: the production CloudFront certificate must be an ISSUED
# us-east-1 ACM certificate in the NEW account and cover every production name.
# Read-only (acm:DescribeCertificate). Usage: require-issued-prod-acm-cert.sh <certificate-arn>
set -euo pipefail

readonly ACCOUNT="098859530205"
readonly REQUIRED_NAMES=(
  "broandbro.in"
  "www.broandbro.in"
  "migrate-prod.broandbro.in"
  "migrate-prod-api.broandbro.in"
)

CERT_ARN="${1:-}"
if [[ ! "$CERT_ARN" =~ ^arn:aws:acm:us-east-1:${ACCOUNT}:certificate/[0-9a-f-]+$ ]]; then
  echo "::error::PROD_ACM_CERTIFICATE_ARN must be a us-east-1 certificate in account ${ACCOUNT}. Run 'Prepare CloudFront ACM Certificate (New Account PROD)' first."
  exit 1
fi

INFO="$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_ARN" --output json)"
STATUS="$(jq -r '.Certificate.Status' <<<"$INFO")"
if [[ "$STATUS" != "ISSUED" ]]; then
  echo "::error::Production certificate status is ${STATUS}, not ISSUED. Add the DNS-validation CNAMEs at the authoritative DNS provider and wait."
  exit 1
fi

for name in "${REQUIRED_NAMES[@]}"; do
  if ! jq -e --arg n "$name" '.Certificate.SubjectAlternativeNames | index($n) != null' <<<"$INFO" >/dev/null; then
    echo "::error::Production certificate does not cover ${name}"
    exit 1
  fi
done

NOT_AFTER="$(jq -r '.Certificate.NotAfter' <<<"$INFO")"
echo "Production ACM certificate verified: ISSUED, all ${#REQUIRED_NAMES[@]} names covered, expires ${NOT_AFTER}."
