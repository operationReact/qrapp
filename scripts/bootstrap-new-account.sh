#!/usr/bin/env bash
# One-command creation of ALL new-account bootstrap AWS resources.
# Prerequisites: AWS SSO/short-lived admin session, Terraform >=1.10 and (optional) gh CLI.
set -euo pipefail

TARGET_ACCOUNT="${1:?Usage: AWS_PROFILE=new-account $0 NEW_12_DIGIT_ACCOUNT_ID [AWS_REGION]}"
REGION="${2:-us-east-1}"
REPO="operationReact/qrapp"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ "$TARGET_ACCOUNT" =~ ^[0-9]{12}$ ]] || { echo "Invalid target account ID" >&2; exit 1; }
ACTUAL="$(aws sts get-caller-identity --query Account --output text --region "$REGION")"
[[ "$ACTUAL" == "$TARGET_ACCOUNT" ]] || { echo "Refusing AWS account $ACTUAL; expected $TARGET_ACCOUNT" >&2; exit 1; }
echo "Verified NEW AWS account $ACTUAL in $REGION"
echo "Terraform will create S3 state, Route53 zone, GitHub OIDC and scoped deploy roles."
terraform -chdir="$ROOT/infra/bootstrap" init -input=false
terraform -chdir="$ROOT/infra/bootstrap" apply -input=false \
  -var "expected_account_id=$TARGET_ACCOUNT" -var "aws_region=$REGION"

BUCKET="$(terraform -chdir="$ROOT/infra/bootstrap" output -raw state_bucket)"
echo "State bucket: $BUCKET"
echo "Keep bootstrap terraform.tfstate safe: it uses local state and must NOT be committed."

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "Configuring GitHub environments, variables and OIDC role ARNs"
  for ENV in dev prod; do
    gh api -X PUT "repos/$REPO/environments/$ENV" >/dev/null
    gh variable set AWS_NEW_ACCOUNT_ID --env "$ENV" --repo "$REPO" --body "$TARGET_ACCOUNT"
    gh variable set TF_STATE_BUCKET --env "$ENV" --repo "$REPO" --body "$BUCKET"
    gh variable set API_DOMAIN --env "$ENV" --repo "$REPO" --body "migrate-$ENV-api.broandbro.in"
    gh variable set API_URL --env "$ENV" --repo "$REPO" --body "https://migrate-$ENV-api.broandbro.in"
    for KIND in terraform frontend backend; do
      UPPER="$(printf '%s' "$KIND" | tr '[:lower:]' '[:upper:]')"
      ROLE="$(terraform -chdir="$ROOT/infra/bootstrap" output -json github_role_arns | python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "$ENV-$KIND")"
      gh secret set "AWS_${UPPER}_ROLE_ARN" --env "$ENV" --repo "$REPO" --body "$ROLE"
    done
  done
  echo "GitHub migration environments configured. Protect prod with required reviewers."
else
  echo "GitHub CLI not authenticated. Configure AWS_NEW_ACCOUNT_ID, TF_STATE_BUCKET,"
  echo "and AWS_TERRAFORM_ROLE_ARN/AWS_FRONTEND_ROLE_ARN/AWS_BACKEND_ROLE_ARN"
  echo "in the dev and prod GitHub Environments using terraform output github_role_arns."
fi
echo "Do NOT change domain registrar nameservers until all old DNS records are replicated."
