#!/bin/bash
# Automated AWS Parameter Store Setup for Broandbro Backend
# This script sets up all parameters with default values
# Usage: bash infra/aws-parameter-store-auto-setup.sh [environment] [region]

set -euo pipefail

: "${DB_PASSWORD:?Set DB_PASSWORD to the current RDS password}"
: "${RAZORPAY_KEY:?Set RAZORPAY_KEY before provisioning SSM}"
: "${RAZORPAY_SECRET:?Set RAZORPAY_SECRET before provisioning SSM}"
: "${AWS_ACCESS_KEY_ID:?Set AWS_ACCESS_KEY_ID before provisioning SSM}"
: "${AWS_SECRET_ACCESS_KEY:?Set AWS_SECRET_ACCESS_KEY before provisioning SSM}"
: "${OPENAI_API_KEY:?Set OPENAI_API_KEY before provisioning SSM}"

ENVIRONMENT="${1:-dev}"
AWS_REGION="${2:-us-east-1}"
PREFIX="/broandbro/backend/${ENVIRONMENT}"

echo "════════════════════════════════════════════════════════════════"
echo "AWS Parameter Store - Automated Setup"
echo "════════════════════════════════════════════════════════════════"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Prefix: $PREFIX"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI not found. Install with: pip install awscli"
  exit 1
fi

# Check credentials
if ! aws sts get-caller-identity --region "$AWS_REGION" &> /dev/null; then
  echo "❌ AWS credentials not configured"
  exit 1
fi

echo "✅ AWS CLI configured"
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
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=ManagedBy,Value=Script" \
    2>/dev/null || true

  echo "  ✅ $name"
}

# ─────────────────────────────────────────────────────────────────
# Database Configuration
# ─────────────────────────────────────────────────────────────────
echo "📝 Setting Database Parameters..."

set_param "$PREFIX/database/url" \
  "jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/broandbro_dev?sslmode=require" \
  "String"

set_param "$PREFIX/database/username" \
  "broandbro" \
  "String"

set_param "$PREFIX/database/password" \
  "$DB_PASSWORD" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# Razorpay Configuration
# ─────────────────────────────────────────────────────────────────
echo "💳 Setting Razorpay Parameters..."

set_param "$PREFIX/razorpay/key" \
  "$RAZORPAY_KEY" \
  "SecureString"

set_param "$PREFIX/razorpay/secret" \
  "$RAZORPAY_SECRET" \
  "SecureString"

set_param "$PREFIX/razorpay/webhookSecret" \
  "rzp_test_mock_webhook_secret" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# AWS S3 Configuration
# ─────────────────────────────────────────────────────────────────
echo "🪣 Setting AWS S3 Parameters..."

set_param "$PREFIX/aws/s3/enabled" \
  "true" \
  "String"

set_param "$PREFIX/aws/s3/bucketName" \
  "broandbro-dev-root-bucket" \
  "String"

set_param "$PREFIX/aws/s3/region" \
  "us-east-1" \
  "String"

set_param "$PREFIX/aws/s3/accessKey" \
  "$AWS_ACCESS_KEY_ID" \
  "SecureString"

set_param "$PREFIX/aws/s3/secretKey" \
  "$AWS_SECRET_ACCESS_KEY" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# OpenAI Configuration
# ─────────────────────────────────────────────────────────────────
echo "🤖 Setting OpenAI Parameters..."

set_param "$PREFIX/openai/apiKey" \
  "$OPENAI_API_KEY" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# Application Configuration
# ─────────────────────────────────────────────────────────────────
echo "⚙️  Setting Application Parameters..."

set_param "$PREFIX/app/cors/allowedOrigins" \
  "https://develop.broandbro.in,http://localhost:5173" \
  "String"

echo ""

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "✅ Parameter Store Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Parameters created:"
echo "   Location: $PREFIX/*"
echo "   Count: $(aws ssm describe-parameters --parameter-filters \"Key=Name,Option=BeginsWith,Values=$PREFIX\" --region $AWS_REGION --query 'Parameters | length(@)' --output text)"
echo ""
echo "🔍 View all parameters:"
echo "   aws ssm describe-parameters --parameter-filters \"Key=Name,Option=BeginsWith,Values=$PREFIX\" --region $AWS_REGION"
echo ""
echo "🔐 View a specific parameter (e.g., database password):"
echo "   aws ssm get-parameter --name \"$PREFIX/database/password\" --with-decryption --region $AWS_REGION"
echo ""
echo "📝 Next steps:"
echo "   1. Ensure EC2 IAM role has SSM permissions"
echo "   2. Rebuild backend: ./gradlew :backend:bootJar -x test"
echo "   3. Deploy to EC2"
echo "   4. Backend will automatically read from Parameter Store"
echo ""
