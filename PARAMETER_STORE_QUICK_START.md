# AWS Parameter Store - Quick Start Guide

## ✅ What's Been Set Up

I've configured everything to store secrets in **AWS Parameter Store** instead of GitHub:

### New Files Created:

1. **`infra/aws-parameter-store-setup.sh`** - Interactive setup script (ask for each value)
2. **`infra/aws-parameter-store-auto-setup.sh`** - Automated setup (uses defaults) ⭐ **USE THIS**
3. **`infra/github-actions-parameter-store-setup.sh`** - GitHub Actions integration
4. **`backend/src/main/java/com/broandbro/qrapp/config/ParameterStoreConfig.java`** - Backend config loader
5. **`AWS_PARAMETER_STORE_SETUP.md`** - Complete documentation

### Files Modified:

1. **`backend/build.gradle`** - Added AWS Parameter Store dependency
2. **`backend/src/main/resources/application.yml`** - Added Parameter Store config
3. **`backend/src/main/resources/application-dev.yml`** - Updated to read from Parameter Store

---

## 🚀 Setup in 3 Steps

### Step 1: Populate AWS Parameter Store (1 minute)

**On your local machine with AWS CLI configured:**

```bash
bash infra/aws-parameter-store-auto-setup.sh dev us-east-1
```

**What it does:**
- ✅ Creates all parameters in AWS Parameter Store
- ✅ Uses default values from your existing config
- ✅ Encrypts sensitive values
- ✅ Tags parameters for organization

**Expected output:**
```
════════════════════════════════════════════════════════════════
✅ Parameter Store Setup Complete!
════════════════════════════════════════════════════════════════
📊 Parameters created:
   Location: /broandbro/backend/dev/*
   Count: 18
```

### Step 2: Verify EC2 IAM Role (2 minutes)

**The EC2 instance needs permission to read Parameter Store:**

1. Go to AWS Console → EC2 → Instances
2. Find your instance: `i-0f2ba63193349f4af`
3. Click → IAM Role
4. Verify the role has policy with:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "ssm:GetParameter",
       "ssm:GetParameters",
       "ssm:GetParametersByPath"
     ],
     "Resource": "arn:aws:ssm:us-east-1:*:parameter/broandbro/backend/dev/*"
   }
   ```

**If not present, add inline policy** (copy above JSON)

### Step 3: Rebuild & Deploy Backend (5 minutes)

```bash
cd backend
./gradlew bootJar -x test

# Deploy to EC2 (same process as before)
# GitHub Actions CI/CD will handle this
```

**Backend will automatically:**
- ✅ Connect to AWS Parameter Store
- ✅ Read all secrets
- ✅ Log "✅ LOADED" for each parameter
- ✅ Start successfully

---

## 🎯 Done! Here's What Changed

### Before
```yaml
# GitHub Secrets
DEV_DB_PASSWORD: xxxxxx
RAZORPAY_KEY: xxxxxx
AWS_ACCESS_KEY_ID: xxxxxx

# Environment variables when deploying
export DEV_DB_PASSWORD=${{ secrets.DEV_DB_PASSWORD }}
export RAZORPAY_KEY=${{ secrets.RAZORPAY_KEY }}
```

### After
```yaml
# AWS Parameter Store (centralized)
/broandbro/backend/dev/database/password
/broandbro/backend/dev/razorpay/key
/broandbro/backend/dev/aws/s3/accessKey

# No secrets in GitHub!
# Backend reads directly from Parameter Store
```

---

## 🔍 Verify It's Working

### Check Parameters Exist

```bash
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" \
  --region us-east-1
```

### View a Specific Secret

```bash
aws ssm get-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --with-decryption \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

### Check Backend Startup Logs

After deploying, SSH to EC2 and check logs:

```bash
# View application startup logs
sudo journalctl -u qrapp -n 50 --no-pager | grep -i "parameter store\|loaded"
```

You should see:

```
════════════════════════════════════════════════════════════════
AWS Parameter Store Configuration Status
════════════════════════════════════════════════════════════════
Database URL: ✅ LOADED
Database Username: ✅ LOADED
Database Password: ✅ LOADED
Razorpay Key: ✅ LOADED
...
```

---

## 📋 Complete Parameter List

All these parameters are now in AWS Parameter Store:

```
/broandbro/backend/dev/database/url
/broandbro/backend/dev/database/username
/broandbro/backend/dev/database/password
/broandbro/backend/dev/razorpay/key
/broandbro/backend/dev/razorpay/secret
/broandbro/backend/dev/razorpay/webhookSecret
/broandbro/backend/dev/aws/s3/enabled
/broandbro/backend/dev/aws/s3/bucketName
/broandbro/backend/dev/aws/s3/region
/broandbro/backend/dev/aws/s3/accessKey
/broandbro/backend/dev/aws/s3/secretKey
/broandbro/backend/dev/twilio/accountSid
/broandbro/backend/dev/twilio/authToken
/broandbro/backend/dev/openai/apiKey
/broandbro/backend/dev/app/cors/allowedOrigins
```

---

## 🔐 Security Benefits

✅ **No secrets in GitHub** - Reduced risk of accidental exposure  
✅ **Centralized management** - Single place to manage all secrets  
✅ **Encryption** - All sensitive values encrypted with AWS KMS  
✅ **Audit trail** - CloudTrail logs all access to secrets  
✅ **Access control** - IAM roles control who can read secrets  
✅ **Easy rotation** - Update a secret without redeploying  
✅ **Version history** - AWS tracks all changes  

---

## 📝 How to Update a Secret

If you need to change a password or API key:

```bash
# Update database password
aws ssm put-parameter \
  --name "/broandbro/backend/dev/database/password" \
  --value "NEW_PASSWORD" \
  --type "SecureString" \
  --overwrite \
  --region us-east-1

# Restart backend to pick up new value
ssh -i key.pem ec2-user@IP
sudo systemctl restart qrapp
```

---

## 🆘 Troubleshooting

### Parameters not loading?

1. **Check IAM permissions:**
   ```bash
   # List all actions the EC2 role can do
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::ACCOUNT:role/EC2Role \
     --action-names ssm:GetParameter \
     --resource-arns arn:aws:ssm:us-east-1:ACCOUNT:parameter/broandbro/backend/dev/*
   ```

2. **Check parameter exists:**
   ```bash
   aws ssm get-parameter \
     --name "/broandbro/backend/dev/database/password" \
     --region us-east-1
   ```

3. **Check backend logs:**
   ```bash
   sudo journalctl -u qrapp -n 100 | grep -i parameter
   ```

### Permission denied error?

1. Go to AWS Console → IAM → Roles
2. Find EC2 instance role
3. Add inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["ssm:GetParameter*"],
         "Resource": "arn:aws:ssm:us-east-1:*:parameter/broandbro/backend/dev/*"
       },
       {
         "Effect": "Allow",
         "Action": ["kms:Decrypt"],
         "Resource": "*"
       }
     ]
   }
   ```

---

## 📚 Full Documentation

For complete details, see: `AWS_PARAMETER_STORE_SETUP.md`

---

## ✅ Checklist

- [ ] Run `bash infra/aws-parameter-store-auto-setup.sh dev us-east-1`
- [ ] Verify parameters created: `aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev"`
- [ ] Verify EC2 IAM role has SSM permissions
- [ ] Rebuild backend: `./gradlew :backend:bootJar -x test`
- [ ] Deploy backend to EC2
- [ ] Check startup logs for "✅ LOADED" messages
- [ ] Test API endpoints
- [ ] (Optional) Remove secrets from GitHub

---

## 🎉 You're Done!

Secrets are now centrally managed in AWS Parameter Store instead of GitHub.

**Next time you need to update a secret:**
```bash
# Just update in Parameter Store
aws ssm put-parameter --name "/broandbro/backend/dev/KEY" --value "VALUE" --overwrite

# Restart backend
systemctl restart qrapp

# Done! No Git commits needed.
```

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** August 15, 2026

