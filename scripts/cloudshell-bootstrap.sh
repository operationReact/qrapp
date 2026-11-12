#!/usr/bin/env bash
# SUPERSEDED (Nov 2026): production-only decision. This path creates DEV roles and a
# second OIDC provider. Use infra/cloudformation/github-oidc-bootstrap-prod.yaml instead
# (see infra/PROD_ONLY_RUNBOOK.md). Refuse unless explicitly overridden for audit work.
if [[ "${BROANDBRO_ALLOW_LEGACY_BOOTSTRAP:-}" != "I_UNDERSTAND_THIS_CREATES_DEV_ROLES" ]]; then
  echo "Refusing: superseded by the prod-only CloudFormation bootstrap (infra/PROD_ONLY_RUNBOOK.md)." >&2
  exit 1
fi
# One-time account bootstrap from the AWS Console's CloudShell; no laptop setup.
# Only the signed-in AWS identity is used. Never paste AWS keys into this script.
set -euo pipefail
ACCOUNT_ID="098859530205"
REGION="ap-south-1"
VERSION="1.12.2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

command -v aws >/dev/null || { echo "AWS CLI is required (launch AWS CloudShell)." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required." >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum is required." >&2; exit 1; }
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"
CALLER="$(aws sts get-caller-identity --query Account --output text --region "$REGION")"
if [[ "$CALLER" != "$ACCOUNT_ID" ]]; then
  echo "REFUSING AWS account $CALLER. Expected new account $ACCOUNT_ID." >&2
  exit 1
fi
echo "Authenticated in target AWS account $CALLER; app resources will use Mumbai."

# Install a pinned Terraform build into the CloudShell home directory only.
# Verify the downloaded zip against the official Terraform SHA256SUMS manifest.
export PATH="$HOME/.local/bin:$PATH"
if ! command -v terraform >/dev/null 2>&1 ||
    ! terraform version -json 2>/dev/null | python3 -c       'import json,sys; sys.exit(json.load(sys.stdin)["terraform_version"] != "1.12.2")'; then
  case "$(uname -m)" in
    x86_64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "Unsupported CloudShell CPU architecture" >&2; exit 1 ;;
  esac
  TEMP="$(mktemp -d)"
  trap 'rm -rf "$TEMP"' EXIT
  FILE="terraform_${VERSION}_linux_${ARCH}.zip"
  URL="https://releases.hashicorp.com/terraform/$VERSION"
  curl --fail --location --silent --show-error --retry 3 "$URL/$FILE" -o "$TEMP/$FILE"
  curl --fail --location --silent --show-error --retry 3     "$URL/terraform_${VERSION}_SHA256SUMS" -o "$TEMP/SHA256SUMS"
  ( cd "$TEMP"
    grep -F "  $FILE" SHA256SUMS > selected.sha256
    sha256sum --check selected.sha256
  )
  mkdir -p "$HOME/.local/bin"
  unzip -p "$TEMP/$FILE" terraform > "$HOME/.local/bin/terraform.new"
  chmod 755 "$HOME/.local/bin/terraform.new"
  mv -f "$HOME/.local/bin/terraform.new" "$HOME/.local/bin/terraform"
fi
terraform version

# Guard against accidentally losing existing bootstrap state and recreating roles.
STATE_BUCKET="broandbro-tfstate-$ACCOUNT_ID-$REGION"
if aws s3api head-bucket --bucket "$STATE_BUCKET" --region "$REGION" 2>/dev/null &&
   [[ ! -s "$ROOT/infra/bootstrap/terraform.tfstate" ]]; then
  echo "Bootstrap bucket exists, but local bootstrap Terraform state is missing." >&2
  echo "Restore the saved bootstrap state before re-running; no resource changes made." >&2
  exit 1
fi

# AWS console session provides short-lived credentials; bootstrap asks for Terraform approval.
echo "Terraform bootstrap creates an S3 state bucket, scoped GitHub IAM roles, and a new Route53 zone."
echo "No production DNS aliases are switched. Read the proposed Terraform plan before confirming."
AWS_REGION="$REGION" "$ROOT/scripts/bootstrap-new-account.sh" "$ACCOUNT_ID" "$REGION"

# Back up the bootstrap state immediately, in a private, encrypted, versioned S3 bucket.
STATE_PATH="$ROOT/infra/bootstrap/terraform.tfstate"
test -s "$STATE_PATH" || { echo "Bootstrap state not found; refusing to proceed." >&2; exit 1; }
aws s3 cp "$STATE_PATH" "s3://$STATE_BUCKET/bootstrap/terraform.tfstate.backup"   --sse AES256 --region "$REGION" --only-show-errors

echo
echo "Bootstrap complete. Secure state backup: s3://$STATE_BUCKET/bootstrap/terraform.tfstate.backup"
echo "GitHub repository: operationReact/qrapp > Settings > Environments > dev"
echo "Environment variables:"
echo "  AWS_NEW_ACCOUNT_ID=$ACCOUNT_ID"
echo "  AWS_REGION=$REGION"
echo "  TF_STATE_BUCKET=$STATE_BUCKET"
echo "  API_URL=https://migrate-dev-api.broandbro.in"
echo "  API_DOMAIN=migrate-dev-api.broandbro.in"
echo "GitHub environment secrets (IAM role ARNs; not access keys):"
terraform -chdir="$ROOT/infra/bootstrap" output -json github_role_arns |   python3 -c 'import json,sys; x=json.load(sys.stdin); print("\n".join("  AWS_"+k.split("-")[1].upper()+"_ROLE_ARN="+x[k] for k in ("dev-terraform","dev-frontend","dev-backend")))'
echo "Require the dev branch in this GitHub environment."
echo "Do not dispatch the Terraform apply until ACM validation DNS is confirmed."
