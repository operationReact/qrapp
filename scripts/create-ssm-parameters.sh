#!/bin/bash

# AWS SSM Parameter Store - Create All Application Parameters
# This script creates all required parameters for the broandbro application
# Run on EC2 instance with proper IAM role (SSM permissions)

set -e

: "${DB_PASSWORD:?Set DB_PASSWORD to the current RDS password}"

ENVIRONMENT="dev"
REGION="us-east-1"
PREFIX="/broandbro/backend/${ENVIRONMENT}"

echo "════════════════════════════════════════════════════════════════"
echo "🔄 Creating AWS SSM Parameters for broandbro Backend"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "════════════════════════════════════════════════════════════════"

# Function to create parameter
create_param() {
    local name=$1
    local value=$2
    local type=${3:-String}  # Default to String

    echo "📝 Creating: $name"

    # Remove parameter if it exists
    aws ssm delete-parameter --name "$name" --region "$REGION" 2>/dev/null || true

    # Create new parameter
    aws ssm put-parameter \
        --name "$name" \
        --value "$value" \
        --type "$type" \
        --overwrite \
        --region "$REGION" \
        > /dev/null 2>&1

    echo "   ✅ Created"
}

# ══════════════════════════════════════════════════════════════════════════
# DATABASE CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "📦 Database Configuration"
create_param "$PREFIX/database/url" \
    "jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/broandbro_dev?sslmode=require"
create_param "$PREFIX/database/username" "broandbro"
create_param "$PREFIX/database/password" "$DB_PASSWORD" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# RAZORPAY CONFIGURATION (Payment Gateway)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "💳 Razorpay Configuration"
create_param "$PREFIX/razorpay/key" "${RAZORPAY_KEY:?Set RAZORPAY_KEY}" "SecureString"
create_param "$PREFIX/razorpay/secret" "${RAZORPAY_SECRET:?Set RAZORPAY_SECRET}" "SecureString"
create_param "$PREFIX/razorpay/webhookSecret" "" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# AWS S3 CONFIGURATION (File Storage)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "📦 AWS S3 Configuration"
create_param "$PREFIX/aws/s3/enabled" "true"
create_param "$PREFIX/aws/s3/bucketName" "broandbro-dev-root-bucket"
create_param "$PREFIX/aws/s3/region" "us-east-1"
create_param "$PREFIX/aws/s3/accessKey" "${AWS_ACCESS_KEY_ID:?Set AWS_ACCESS_KEY_ID}" "SecureString"
create_param "$PREFIX/aws/s3/secretKey" "${AWS_SECRET_ACCESS_KEY:?Set AWS_SECRET_ACCESS_KEY}" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# OPENAI CONFIGURATION (Image Generation)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "🤖 OpenAI Configuration"
create_param "$PREFIX/openai/apiKey" \
    "${OPENAI_API_KEY:?Set OPENAI_API_KEY}" \
    "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# APPLICATION CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "⚙️  Application Configuration"
create_param "$PREFIX/app/corsAllowedOrigins" \
    "https://develop.broandbro.in,http://localhost:5173"

# ══════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ All parameters created!"
echo "════════════════════════════════════════════════════════════════"

echo ""
echo "🔍 Verifying parameters..."
aws ssm describe-parameters \
    --parameter-filters "Key=Name,Option=BeginsWith,Values=$PREFIX" \
    --region "$REGION" \
    --query 'Parameters[*].[Name,Type,LastModifiedDate]' \
    --output table

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ SSM Parameter Store Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Restart application: sudo systemctl restart broandbro"
echo "2. Check logs: sudo journalctl -u broandbro -n 200"
echo "3. Verify: Check that application connects to correct database"
