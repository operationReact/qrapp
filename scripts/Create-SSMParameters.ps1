# AWS SSM Parameter Store - Create All Application Parameters (PowerShell)
# This script creates required parameters for the broandbro application.
# IMPORTANT: Never hardcode credentials or API secrets in this file.
# Supply secrets through environment variables or, preferably for AWS access on EC2,
# use an IAM role / instance profile instead of long-lived access keys.

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$PREFIX = "/broandbro/backend/$Environment"

function Require-Env {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required environment variable '$Name' is not set."
    }
    return $value
}

function Create-Param {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Type = "String"
    )

    Write-Host "Creating: $Name" -ForegroundColor Green
    aws ssm put-parameter `
        --name $Name `
        --value $Value `
        --type $Type `
        --overwrite `
        --region $Region | Out-Null
}

Write-Host "Creating AWS SSM parameters for broandbro Backend" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Database
Create-Param "$PREFIX/database/url" "jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/broandbro_dev?sslmode=require"
Create-Param "$PREFIX/database/username" "broandbro"
Create-Param "$PREFIX/database/password" (Require-Env "DB_PASSWORD") "SecureString"

# Razorpay
Create-Param "$PREFIX/razorpay/key" (Require-Env "RAZORPAY_KEY_ID") "SecureString"
Create-Param "$PREFIX/razorpay/secret" (Require-Env "RAZORPAY_KEY_SECRET") "SecureString"
$razorpayWebhookSecret = [Environment]::GetEnvironmentVariable("RAZORPAY_WEBHOOK_SECRET")
if (-not [string]::IsNullOrWhiteSpace($razorpayWebhookSecret)) {
    Create-Param "$PREFIX/razorpay/webhookSecret" $razorpayWebhookSecret "SecureString"
}

# S3 configuration
Create-Param "$PREFIX/aws/s3/enabled" "true"
Create-Param "$PREFIX/aws/s3/bucketName" "broandbro-menu-images-dev"
Create-Param "$PREFIX/aws/s3/region" "us-east-1"

# Do not store AWS access keys unless there is a documented legacy requirement.
# EC2 should use its IAM role / instance profile. If the application still needs
# explicit credentials temporarily, provide NON-ROOT credentials through env vars.
$awsAccessKeyId = [Environment]::GetEnvironmentVariable("APP_AWS_ACCESS_KEY_ID")
$awsSecretAccessKey = [Environment]::GetEnvironmentVariable("APP_AWS_SECRET_ACCESS_KEY")
if (-not [string]::IsNullOrWhiteSpace($awsAccessKeyId) -and -not [string]::IsNullOrWhiteSpace($awsSecretAccessKey)) {
    Create-Param "$PREFIX/aws/s3/accessKey" $awsAccessKeyId "SecureString"
    Create-Param "$PREFIX/aws/s3/secretKey" $awsSecretAccessKey "SecureString"
} else {
    Write-Host "AWS access keys not supplied; expecting workload IAM role credentials." -ForegroundColor Yellow
}

# OpenAI
Create-Param "$PREFIX/openai/apiKey" (Require-Env "OPENAI_API_KEY") "SecureString"

# Application configuration
Create-Param "$PREFIX/app/corsAllowedOrigins" "https://develop.broandbro.in,http://localhost:5173"

Write-Host "SSM Parameter Store setup complete." -ForegroundColor Green
Write-Host "Verifying parameter names (values are not printed)..." -ForegroundColor Cyan
aws ssm describe-parameters `
    --parameter-filters "Key=Name,Option=BeginsWith,Values=$PREFIX" `
    --region $Region `
    --query 'Parameters[*].[Name,Type,LastModifiedDate]' `
    --output table
