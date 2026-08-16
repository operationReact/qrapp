#!/bin/bash

# AWS SSM Parameter Store - Create All Application Parameters
# This script creates all required parameters for the broandbro application
# Run on EC2 instance with proper IAM role (SSM permissions)

set -e

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
    "jdbc:postgresql://broandbro-dev.chi2yu0m6hp0.us-east-1.rds.amazonaws.com:5432/broandbro_dev"
create_param "$PREFIX/database/username" "broandbro"
create_param "$PREFIX/database/password" "BroApp#2025" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# RAZORPAY CONFIGURATION (Payment Gateway)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "💳 Razorpay Configuration"
create_param "$PREFIX/razorpay/key" "rzp_test_SXoONgvkn7mSte"
create_param "$PREFIX/razorpay/secret" "rzp_test_SXoONgvkn7mSte" "SecureString"
create_param "$PREFIX/razorpay/webhookSecret" "" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# AWS S3 CONFIGURATION (File Storage)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "📦 AWS S3 Configuration"
create_param "$PREFIX/aws/s3/enabled" "true"
create_param "$PREFIX/aws/s3/bucketName" "broandbro-menu-images-dev"
create_param "$PREFIX/aws/s3/region" "us-east-1"
create_param "$PREFIX/aws/s3/accessKey" "AKIA34EPRSL6ICFWRYHI" "SecureString"
create_param "$PREFIX/aws/s3/secretKey" "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" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# TWILIO CONFIGURATION (SMS/WhatsApp)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "📱 Twilio Configuration"
create_param "$PREFIX/twilio/accountSid" "ACc9ccb1101977a6bc3adc0806c56f026f" "SecureString"
create_param "$PREFIX/twilio/authToken" "8c98ee56d052a01711546c12441b230b" "SecureString"

# ══════════════════════════════════════════════════════════════════════════
# OPENAI CONFIGURATION (Image Generation)
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "🤖 OpenAI Configuration"
create_param "$PREFIX/openai/apiKey" \
    "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" \
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

