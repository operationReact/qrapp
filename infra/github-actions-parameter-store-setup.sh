#!/bin/bash
# GitHub Actions Step - Setup AWS Parameter Store
# Add this to your .github/workflows/deploy-dev.yml

set -euo pipefail

# Called with: bash infra/github-actions-parameter-store-setup.sh <region> <environment>

AWS_REGION="${1:-us-east-1}"
ENVIRONMENT="${2:-dev}"
PREFIX="/broandbro/backend/${ENVIRONMENT}"

echo "🔑 Setting up AWS Parameter Store via GitHub Actions..."
echo "   Region: $AWS_REGION"
echo "   Environment: $ENVIRONMENT"
echo "   Prefix: $PREFIX"
echo ""

# Function to set parameter
set_param() {
  local name="$1"
  local value="$2"
  local type="$3"

  aws ssm put-parameter \
    --name "$name" \
    --value "$value" \
    --type "$type" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Source,Value=GitHubActions" \
    2>/dev/null

  echo "  ✅ $name"
}

# ─────────────────────────────────────────────────────────────────
# Database Configuration (from GitHub Secrets)
# ─────────────────────────────────────────────────────────────────
echo "📝 Setting Database Parameters..."

if [ -n "${DEV_DB_USERNAME:-}" ] && [ -n "${DEV_DB_PASSWORD:-}" ]; then
  set_param "$PREFIX/database/username" "$DEV_DB_USERNAME" "String"
  set_param "$PREFIX/database/password" "$DEV_DB_PASSWORD" "SecureString"
  echo "  ✅ Database credentials synced from GitHub Secrets"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# Razorpay Configuration (from GitHub Secrets)
# ─────────────────────────────────────────────────────────────────
echo "💳 Setting Razorpay Parameters..."

if [ -n "${DEV_RAZORPAY_KEY:-}" ]; then
  set_param "$PREFIX/razorpay/key" "$DEV_RAZORPAY_KEY" "SecureString"
fi

if [ -n "${DEV_RAZORPAY_SECRET:-}" ]; then
  set_param "$PREFIX/razorpay/secret" "$DEV_RAZORPAY_SECRET" "SecureString"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# AWS S3 Configuration (from GitHub Secrets)
# ─────────────────────────────────────────────────────────────────
echo "🪣 Setting AWS S3 Parameters..."

if [ -n "${APP_AWS_ACCESS_KEY_ID:-}" ]; then
  set_param "$PREFIX/aws/s3/accessKey" "$APP_AWS_ACCESS_KEY_ID" "SecureString"
fi

if [ -n "${APP_AWS_SECRET_ACCESS_KEY:-}" ]; then
  set_param "$PREFIX/aws/s3/secretKey" "$APP_AWS_SECRET_ACCESS_KEY" "SecureString"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────
echo "✅ AWS Parameter Store updated from GitHub Secrets"
echo ""
echo "📊 Current parameters:"
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=$PREFIX" \
  --region "$AWS_REGION" \
  --query 'Parameters[].Name' \
  --output text | tr '\t' '\n' | sed 's/^/   /'
echo ""

