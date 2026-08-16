# AWS SSM Parameter Store - Create All Application Parameters (PowerShell)
# This script creates all required parameters for the broandbro application
# Run on Windows with AWS CLI and proper IAM credentials

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$PREFIX = "/broandbro/backend/$Environment"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 Creating AWS SSM Parameters for broandbro Backend" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Function to create parameter
function Create-Param {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Type = "String"
    )

    Write-Host "📝 Creating: $Name" -ForegroundColor Green

    # Remove parameter if it exists
    aws ssm delete-parameter --name $Name --region $Region 2>$null

    # Create new parameter
    $escapedValue = $Value -replace '"', '\"'
    aws ssm put-parameter `
        --name $Name `
        --value $escapedValue `
        --type $Type `
        --overwrite `
        --region $Region `
        2>$null

    Write-Host "   ✅ Created" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# DATABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📦 Database Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/database/url" `
    "jdbc:postgresql://broandbro-dev.chi2yu0m6hp0.us-east-1.rds.amazonaws.com:5432/broandbro_dev"
Create-Param "$PREFIX/database/username" "broandbro"
Create-Param "$PREFIX/database/password" "BroApp#2025" "SecureString"

# ═══════════════════════════════════════════════════════════════════════════
# RAZORPAY CONFIGURATION (Payment Gateway)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "💳 Razorpay Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/razorpay/key" "rzp_test_SXoONgvkn7mSte"
Create-Param "$PREFIX/razorpay/secret" "rzp_test_SXoONgvkn7mSte" "SecureString"
Create-Param "$PREFIX/razorpay/webhookSecret" "" "SecureString"

# ═══════════════════════════════════════════════════════════════════════════
# AWS S3 CONFIGURATION (File Storage)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📦 AWS S3 Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/aws/s3/enabled" "true"
Create-Param "$PREFIX/aws/s3/bucketName" "broandbro-menu-images-dev"
Create-Param "$PREFIX/aws/s3/region" "us-east-1"
Create-Param "$PREFIX/aws/s3/accessKey" "AKIA34EPRSL6ICFWRYHI" "SecureString"
Create-Param "$PREFIX/aws/s3/secretKey" "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" "SecureString"

# ═══════════════════════════════════════════════════════════════════════════
# TWILIO CONFIGURATION (SMS/WhatsApp)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📱 Twilio Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/twilio/accountSid" "ACc9ccb1101977a6bc3adc0806c56f026f" "SecureString"
Create-Param "$PREFIX/twilio/authToken" "8c98ee56d052a01711546c12441b230b" "SecureString"

# ═══════════════════════════════════════════════════════════════════════════
# OPENAI CONFIGURATION (Image Generation)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🤖 OpenAI Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/openai/apiKey" `
    "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" `
    "SecureString"

# ═══════════════════════════════════════════════════════════════════════════
# APPLICATION CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "⚙️  Application Configuration" -ForegroundColor Yellow
Create-Param "$PREFIX/app/corsAllowedOrigins" `
    "https://develop.broandbro.in,http://localhost:5173"

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ All parameters created!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔍 Verifying parameters..." -ForegroundColor Cyan
aws ssm describe-parameters `
    --parameter-filters "Key=Name,Option=BeginsWith,Values=$PREFIX" `
    --region $Region `
    --query 'Parameters[*].[Name,Type,LastModifiedDate]' `
    --output table

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SSM Parameter Store Setup Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. On EC2: sudo systemctl restart broandbro" -ForegroundColor Gray
Write-Host "2. On EC2: sudo journalctl -u broandbro -n 200" -ForegroundColor Gray
Write-Host "3. Verify: Check that application connects to correct database" -ForegroundColor Gray

