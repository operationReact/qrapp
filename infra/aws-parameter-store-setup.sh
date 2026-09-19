#!/bin/bash
# AWS Parameter Store Configuration Script
# This script creates/updates all secrets in AWS Parameter Store
# Run: bash infra/aws-parameter-store-setup.sh

set -euo pipefail

echo "════════════════════════════════════════════════════════════════"
echo "AWS Parameter Store Setup"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Configuration
ENVIRONMENT="${1:-dev}"
AWS_REGION="${2:-us-east-1}"
PREFIX="/broandbro/backend/${ENVIRONMENT}"

echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Parameter Prefix: $PREFIX"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI not found. Please install it first."
  exit 1
fi

# Check credentials
if ! aws sts get-caller-identity --region "$AWS_REGION" &> /dev/null; then
  echo "❌ AWS credentials not configured. Please set up AWS CLI."
  exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# ─────────────────────────────────────────────────────────────────
# Database Configuration
# ─────────────────────────────────────────────────────────────────
echo "📝 Setting Database Parameters..."

read -p "Database URL (default: jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/broandbro_dev?sslmode=require): " DB_URL
DB_URL=${DB_URL:-jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/broandbro_dev?sslmode=require}

read -p "Database Username (default: broandbro): " DB_USER
DB_USER=${DB_USER:-broandbro}

read -sp "Database Password: " DB_PASS
if [ -z "$DB_PASS" ]; then
  echo ""
  echo "❌ Database password is required"
  exit 1
fi
echo ""

aws ssm put-parameter \
  --name "$PREFIX/database/url" \
  --value "$DB_URL" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Database"

aws ssm put-parameter \
  --name "$PREFIX/database/username" \
  --value "$DB_USER" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Database"

aws ssm put-parameter \
  --name "$PREFIX/database/password" \
  --value "$DB_PASS" \
  --type "SecureString" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Database"

echo "✅ Database parameters stored"
echo ""

# ─────────────────────────────────────────────────────────────────
# Razorpay Configuration
# ─────────────────────────────────────────────────────────────────
echo "💳 Setting Razorpay Parameters..."

read -p "Razorpay Key (leave empty to skip): " RAZORPAY_KEY
if [ -n "$RAZORPAY_KEY" ]; then
  aws ssm put-parameter \
    --name "$PREFIX/razorpay/key" \
    --value "$RAZORPAY_KEY" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Payment"
fi

read -sp "Razorpay Secret (leave empty to skip): " RAZORPAY_SECRET
if [ -n "$RAZORPAY_SECRET" ]; then
  echo ""
  aws ssm put-parameter \
    --name "$PREFIX/razorpay/secret" \
    --value "$RAZORPAY_SECRET" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Payment"
fi

read -sp "Razorpay Webhook Secret (leave empty to skip): " RAZORPAY_WEBHOOK_SECRET
if [ -n "$RAZORPAY_WEBHOOK_SECRET" ]; then
  echo ""
  aws ssm put-parameter \
    --name "$PREFIX/razorpay/webhookSecret" \
    --value "$RAZORPAY_WEBHOOK_SECRET" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Payment"
fi

echo ""
echo "✅ Razorpay parameters stored"
echo ""

# ─────────────────────────────────────────────────────────────────
# AWS S3 Configuration
# ─────────────────────────────────────────────────────────────────
echo "🪣 Setting AWS S3 Parameters..."

read -p "S3 Enabled (true/false, default: true): " S3_ENABLED
S3_ENABLED=${S3_ENABLED:-true}

read -p "S3 Bucket Name (default: broandbro-dev-root-bucket): " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-broandbro-dev-root-bucket}

read -p "S3 Region (default: us-east-1): " S3_REGION
S3_REGION=${S3_REGION:-us-east-1}

read -p "AWS Access Key ID (leave empty to skip): " AWS_KEY_ID
if [ -n "$AWS_KEY_ID" ]; then
  aws ssm put-parameter \
    --name "$PREFIX/aws/s3/accessKey" \
    --value "$AWS_KEY_ID" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Storage"
fi

read -sp "AWS Secret Access Key (leave empty to skip): " AWS_SECRET_KEY
if [ -n "$AWS_SECRET_KEY" ]; then
  echo ""
  aws ssm put-parameter \
    --name "$PREFIX/aws/s3/secretKey" \
    --value "$AWS_SECRET_KEY" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Storage"
fi

aws ssm put-parameter \
  --name "$PREFIX/aws/s3/enabled" \
  --value "$S3_ENABLED" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Storage"

aws ssm put-parameter \
  --name "$PREFIX/aws/s3/bucketName" \
  --value "$S3_BUCKET" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Storage"

aws ssm put-parameter \
  --name "$PREFIX/aws/s3/region" \
  --value "$S3_REGION" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Storage"

echo ""
echo "✅ S3 parameters stored"
echo ""

# ─────────────────────────────────────────────────────────────────
# OpenAI Configuration
# ─────────────────────────────────────────────────────────────────
echo "🤖 Setting OpenAI Parameters..."

read -sp "OpenAI API Key (leave empty to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
  echo ""
  aws ssm put-parameter \
    --name "$PREFIX/openai/apiKey" \
    --value "$OPENAI_KEY" \
    --type "SecureString" \
    --overwrite \
    --region "$AWS_REGION" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=AI"
fi

echo ""
echo "✅ OpenAI parameters stored"
echo ""

# ─────────────────────────────────────────────────────────────────
# Application Configuration
# ─────────────────────────────────────────────────────────────────
echo "⚙️  Setting Application Parameters..."

read -p "CORS Allowed Origins (default: https://develop.broandbro.in,http://localhost:5173): " CORS_ORIGINS
CORS_ORIGINS=${CORS_ORIGINS:-https://develop.broandbro.in,http://localhost:5173}

aws ssm put-parameter \
  --name "$PREFIX/app/cors/allowedOrigins" \
  --value "$CORS_ORIGINS" \
  --type "String" \
  --overwrite \
  --region "$AWS_REGION" \
  --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Component,Value=Application"

echo "✅ Application parameters stored"
echo ""

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "✅ All Parameters Stored Successfully!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Parameters stored in AWS Parameter Store:"
echo "   Prefix: $PREFIX"
echo ""
echo "🔍 To view parameters:"
echo "   aws ssm describe-parameters --parameter-filters \"Key=Name,Option=BeginsWith,Values=$PREFIX\" --region $AWS_REGION"
echo ""
echo "🔐 To retrieve a parameter:"
echo "   aws ssm get-parameter --name \"$PREFIX/database/password\" --with-decryption --region $AWS_REGION"
echo ""
echo "📝 Backend will automatically read from Parameter Store"
echo "   Update the IAM role to allow ssm:GetParameter*"
echo ""
