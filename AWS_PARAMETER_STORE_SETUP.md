# AWS Parameter Store - Production Secret Management

## Overview

Instead of storing secrets in GitHub, we're using **AWS Parameter Store** (Systems Manager Parameter Store) for centralized, secure secret management.

**Benefits:**
- ✅ Secrets never stored in GitHub
- ✅ Centralized management
- ✅ Audit trail of secret access
- ✅ Encryption with AWS KMS
- ✅ Access control via IAM roles
- ✅ Easy rotation
- ✅ No environment variable exposure

---

## Architecture

```
┌─────────────────────────────────────────┐
│   AWS Parameter Store                   │
│   /broandbro/backend/dev/...            │
│   ├─ database/url                       │
│   ├─ database/username                  │
│   ├─ database/password                  │
│   ├─ razorpay/key                       │
│   ├─ razorpay/secret                    │
│   ├─ aws/s3/accessKey                   │
│   └─ app/cors/allowedOrigins            │
└──────────────────┬──────────────────────┘
                   │ (EC2 IAM role reads via SDK)
┌──────────────────▼──────────────────────┐
│   Spring Boot Application                │
│   ParameterStoreConfig.java              │
│   ├─ Reads from Parameter Store          │
│   ├─ Fallback to Env Vars                │
│   └─ Fallback to Defaults                │
└─────────────────────────────────────────┘
```

---

## Setup Steps

### Step 1: Populate AWS Parameter Store

**Run the setup script (interactive):**

```bash
bash infra/aws-parameter-store-setup.sh dev us-east-1
```

**What it does:**
- Creates parameters in AWS Parameter Store
- Prompts for values (or uses defaults)
- Encrypts sensitive values with SecureString
- Tags parameters for organization

**Example parameters created:**
```
/broandbro/backend/dev/database/url
/broandbro/backend/dev/database/username
/broandbro/backend/dev/database/password (encrypted)
/broandbro/backend/dev/razorpay/key (encrypted)
/broandbro/backend/dev/razorpay/secret (encrypted)
/broandbro/backend/dev/aws/s3/accessKey (encrypted)
/broandbro/backend/dev/aws/s3/secretKey (encrypted)
/broandbro/backend/dev/app/cors/allowedOrigins
```

### Step 2: EC2 IAM Role Configuration

Ensure your EC2 instance IAM role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/broandbro/backend/dev/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:YOUR_ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

### Step 3: Backend Already Configured

The backend is already configured to read from Parameter Store:

**New file:**
- `backend/src/main/java/com/broandbro/qrapp/config/ParameterStoreConfig.java`

**Updated files:**
- `backend/build.gradle` - Added AWS Parameter Store dependency
- `backend/src/main/resources/application.yml` - Added Parameter Store config
- `backend/src/main/resources/application-dev.yml` - Updated datasource to use Parameter Store

### Step 4: GitHub Actions - Remove GitHub Secrets

**No changes needed!** The GitHub Actions workflow can continue using secrets, but they're now optional:

```yaml
# GitHub Secrets are now OPTIONAL
# Can remove these from GitHub:
#   DEV_DB_USERNAME
#   DEV_DB_PASSWORD
#   DEV_RAZORPAY_KEY
#   DEV_RAZORPAY_SECRET
#   etc.

# Backend will read from Parameter Store instead
```

---

## How It Works

### Configuration Priority

When the backend starts, it reads values in this order:

```
1. AWS Parameter Store     ← PRIMARY (if AWS SDK available & IAM permits)
   /broandbro/backend/dev/{section}/{key}

2. Environment Variables   ← FALLBACK (ENV_VAR_NAME)
   SPRING_DATASOURCE_PASSWORD=xxx

3. Java System Properties  ← FALLBACK
   -Dspring.datasource.password=xxx

4. Hardcoded Defaults      ← LAST RESORT
   application.yml values
```

**Example - Database Password:**

```yaml
# application-dev.yml
password: ${SPRING_DATASOURCE_PASSWORD:${app.parameter-store.database.password:BroApp#2025}}
```

**Flow:**
1. Check `SPRING_DATASOURCE_PASSWORD` env var
2. If not set, check `/broandbro/backend/dev/database/password` in Parameter Store
3. If not found, use hardcoded default `BroApp#2025`

### Logging

On application startup, you'll see:

```
════════════════════════════════════════════════════════════════
AWS Parameter Store Configuration Status
═════════════════════════════════════════���══════════════════════
Database URL: ✅ LOADED
Database Username: ✅ LOADED
Database Password: ✅ LOADED
Razorpay Key: ✅ LOADED
Razorpay Secret: ✅ LOADED
S3 Enabled: ✅ LOADED
S3 Bucket: ✅ LOADED
Twilio Account: ✅ LOADED
OpenAI API Key: ✅ LOADED
CORS Origins: ✅ LOADED
════════════════════════════════════════════════════════════════
```

---

## Managing Parameters

### View All Parameters

```bash
# List all parameters for dev environment
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" \
  --region us-east-1
```

### Get a Parameter

```bash
# Get database password (decrypted)
aws ssm get-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

### Update a Parameter

```bash
# Update Razorpay key
aws ssm put-parameter \
  --name "/broandbro/backend/dev/razorpay/key" \
  --value "NEW_KEY_VALUE" \
  --type "SecureString" \
  --overwrite \
  --region us-east-1
```

### Delete a Parameter

```bash
# Delete a parameter
aws ssm delete-parameter \
  --name "/broandbro/backend/dev/razorpay/key" \
  --region us-east-1
```

---

## Parameter Store Naming Convention

All parameters follow this structure:

```
/broandbro/backend/{ENVIRONMENT}/{SECTION}/{KEY}
```

**Examples:**

| Path | Type | Purpose |
|------|------|---------|
| `/broandbro/backend/dev/database/url` | String | Database connection URL |
| `/broandbro/backend/dev/database/username` | String | Database username |
| `/broandbro/backend/dev/database/password` | SecureString | Database password |
| `/broandbro/backend/dev/razorpay/key` | SecureString | Razorpay API key |
| `/broandbro/backend/dev/razorpay/secret` | SecureString | Razorpay API secret |
| `/broandbro/backend/dev/aws/s3/accessKey` | SecureString | AWS S3 access key |
| `/broandbro/backend/dev/aws/s3/secretKey` | SecureString | AWS S3 secret key |
| `/broandbro/backend/dev/app/cors/allowedOrigins` | String | CORS allowed origins |

**Conventions:**
- Use `SecureString` for sensitive values (passwords, keys, tokens)
- Use `String` for non-sensitive values
- Use lowercase for consistency
- Use `/` to organize hierarchically

---

## Security Best Practices

### 1. IAM Role Permissions

**✅ GOOD:** Narrow permissions to specific paths

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter*"],
  "Resource": "arn:aws:ssm:us-east-1:ACCOUNT:parameter/broandbro/backend/dev/*"
}
```

**❌ BAD:** Broad permissions

```json
{
  "Effect": "Allow",
  "Action": ["ssm:*"],
  "Resource": "*"
}
```

### 2. Use SecureString for Secrets

```bash
# SecureString encrypts with KMS
aws ssm put-parameter \
  --name "/broandbro/backend/dev/db/password" \
  --value "secret" \
  --type "SecureString"  # ✅ Good
```

### 3. Enable Encryption

```bash
# Use KMS key (AWS managed or customer managed)
aws ssm put-parameter \
  --name "/broandbro/backend/dev/db/password" \
  --value "secret" \
  --type "SecureString" \
  --key-id "alias/aws/ssm"  # AWS managed key
```

### 4. Enable Audit Logging

CloudTrail automatically logs all Parameter Store access.

```bash
# View audit logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetParameter \
  --region us-east-1
```

### 5. Rotate Secrets Regularly

```bash
# Update a secret
aws ssm put-parameter \
  --name "/broandbro/backend/dev/razorpay/key" \
  --value "NEW_KEY_VALUE" \
  --type "SecureString" \
  --overwrite

# Backend will pick up new value on next restart
```

---

## Troubleshooting

### Issue: Backend can't read from Parameter Store

**Check IAM role:**
```bash
# Verify role has permissions
aws iam get-role-policy \
  --role-name EC2InstanceRole \
  --policy-name ParameterStorePolicy
```

**Check parameter exists:**
```bash
# Verify parameter is created
aws ssm get-parameter \
  --name "/broandbro/backend/dev/database/url" \
  --region us-east-1
```

**Check CloudWatch logs:**
```bash
# SSH to EC2 and check logs
sudo journalctl -u your-service-name -n 100 --no-pager | grep -i parameter
```

### Issue: SecureString decrypt error

**Ensure KMS permissions:**
```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt"],
  "Resource": "arn:aws:kms:us-east-1:ACCOUNT:key/*"
}
```

### Issue: Parameter not found

**Check parameter name:**
```bash
# List all parameters matching pattern
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro" \
  --region us-east-1
```

---

## Migration from GitHub Secrets

### Before (GitHub Secrets)

```yaml
# .github/workflows/deploy.yml
env:
  DEV_DB_PASSWORD: ${{ secrets.DEV_DB_PASSWORD }}
  RAZORPAY_KEY: ${{ secrets.RAZORPAY_KEY }}
```

### After (Parameter Store)

```yaml
# .github/workflows/deploy.yml
# No secrets in GitHub!
# Backend reads directly from Parameter Store via EC2 IAM role
```

**Steps to migrate:**

1. ✅ Run setup script to populate Parameter Store
2. ✅ Verify parameters are created
3. ✅ Deploy backend (automatically reads from Parameter Store)
4. ✅ Remove GitHub secrets (optional, but recommended)
5. ✅ Clean up environment variables in deployment scripts

---

## Cost

AWS Parameter Store pricing:

- **Standard tier (default):**
  - Free: Up to 10,000 parameters
  - Each parameter: $0 per month

- **Advanced tier (for large deployments):**
  - Each parameter: $0.05/month
  - 10,000+ parameters

**Cost for your setup:** ~$0 (standard tier is free)

---

## Advantages Over Environment Variables

| Feature | Env Vars | Parameter Store |
|---------|----------|-----------------|
| Centralized | ❌ No | ✅ Yes |
| Audit Trail | ❌ No | ✅ Yes (CloudTrail) |
| Encryption | ❌ No | ✅ Yes (KMS) |
| Access Control | ❌ No | ✅ Yes (IAM) |
| Secret Rotation | ❌ Hard | ✅ Easy |
| Version Control | ❌ Risky | ✅ Safe |
| Cost | ✅ Free | ✅ Free |
| Complexity | ✅ Simple | ⚠️ Moderate |

---

## Quick Reference

### Setup Parameter Store
```bash
bash infra/aws-parameter-store-setup.sh dev us-east-1
```

### View Parameter
```bash
aws ssm get-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --with-decryption \
  --region us-east-1
```

### Update Parameter
```bash
aws ssm put-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --value "NEW_VALUE" \
  --type "SecureString" \
  --overwrite \
  --region us-east-1
```

### Delete Parameter
```bash
aws ssm delete-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --region us-east-1
```

### Backend Restart
```bash
# Backend picks up new values on restart
sudo systemctl restart qrapp
```

---

## Next Steps

1. ✅ Run setup script to populate Parameter Store
2. ✅ Verify EC2 IAM role has permissions
3. ✅ Deploy backend
4. ✅ Monitor logs for "✅ LOADED" messages
5. ✅ Test API endpoints
6. ✅ (Optional) Remove GitHub secrets

---

**Status:** ✅ Production-Ready  
**Last Updated:** August 15, 2026

