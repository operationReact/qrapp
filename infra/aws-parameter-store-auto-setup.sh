#!/bin/bash
# Automated AWS Parameter Store Setup for Broandbro Backend
# This script sets up all parameters with default values
# Usage: bash infra/aws-parameter-store-auto-setup.sh [environment] [region]

set -euo pipefail

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
  "jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/postgres" \
  "String"

set_param "$PREFIX/database/username" \
  "BROANDBRODEV" \
  "String"

set_param "$PREFIX/database/password" \
  "BroApp#2025" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# Razorpay Configuration
# ─────────────────────────────────────────────────────────────────
echo "💳 Setting Razorpay Parameters..."

set_param "$PREFIX/razorpay/key" \
  "rzp_test_SXoONgvkn7mSte" \
  "SecureString"

set_param "$PREFIX/razorpay/secret" \
  "cT115GamOarfQX8BhxVmIwj9" \
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
  "AKIA34EPRSL6ICFWRYHI" \
  "SecureString"

set_param "$PREFIX/aws/s3/secretKey" \
  "Y7wq2csJAE9+lTIXh/YISp5DkFOP8ETr9P1nifS0" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# Twilio Configuration
# ─────────────────────────────────────────────────────────────────
echo "💬 Setting Twilio Parameters..."

set_param "$PREFIX/twilio/accountSid" \
  "ACc9ccb1101977a6bc3adc0806c56f026f" \
  "String"

set_param "$PREFIX/twilio/authToken" \
  "8c98ee56d052a01711546c12441b230b" \
  "SecureString"

echo ""

# ─────────────────────────────────────────────────────────────────
# OpenAI Configuration
# ─────────────────────────────────────────────────────────────────
echo "🤖 Setting OpenAI Parameters..."

set_param "$PREFIX/openai/apiKey" \
  "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" \
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

