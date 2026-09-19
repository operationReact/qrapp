# 🚀 SSM Parameter Store Setup Guide

**Status:** Ready to Create All Parameters  
**Target:** AWS SSM Parameter Store  
**Environment:** dev  

---

## 📋 What Will Be Created

The script creates **15 parameters** organized by service:

### Database (3 parameters)
```
✅ /broandbro/backend/dev/database/url
✅ /broandbro/backend/dev/database/username
✅ /broandbro/backend/dev/database/password
```

### Razorpay (3 parameters)
```
✅ /broandbro/backend/dev/razorpay/key
✅ /broandbro/backend/dev/razorpay/secret
✅ /broandbro/backend/dev/razorpay/webhookSecret
```

### AWS S3 (5 parameters)
```
✅ /broandbro/backend/dev/aws/s3/enabled
✅ /broandbro/backend/dev/aws/s3/bucketName
✅ /broandbro/backend/dev/aws/s3/region
✅ /broandbro/backend/dev/aws/s3/accessKey
✅ /broandbro/backend/dev/aws/s3/secretKey
```

### Twilio (2 parameters)
```
✅ /broandbro/backend/dev/twilio/accountSid
✅ /broandbro/backend/dev/twilio/authToken
```

### OpenAI (1 parameter)
```
✅ /broandbro/backend/dev/openai/apiKey
```

### Application (1 parameter)
```
✅ /broandbro/backend/dev/app/corsAllowedOrigins
```

---

## 🚀 Option 1: Run from EC2 (Recommended)

### Prerequisites
- SSH access to EC2 instance
- EC2 has IAM role with SSM permissions
- AWS CLI installed on EC2

### Run Script

```bash
# 1. Upload script to EC2
scp -i key.pem scripts/create-ssm-parameters.sh ec2-user@EC2_IP:/tmp/

# 2. SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# 3. Make script executable
chmod +x /tmp/create-ssm-parameters.sh

# 4. Run script
/tmp/create-ssm-parameters.sh
```

**Expected output:**
```
════════════════════════════════════════════════════════════════
🔄 Creating AWS SSM Parameters for broandbro Backend
Environment: dev
Region: us-east-1
════════════════════════════════════════════════════════════════

📦 Database Configuration
📝 Creating: /broandbro/backend/dev/database/url
   ✅ Created
📝 Creating: /broandbro/backend/dev/database/username
   ✅ Created
... (all parameters)

✅ All parameters created!

🔍 Verifying parameters...
Name                                        Type         LastModifiedDate
─────────────────────────────────────────────────────────────────────────
/broandbro/backend/dev/database/url         String       2026-08-16...
/broandbro/backend/dev/database/username    String       2026-08-16...
... (all parameters listed)
```

---

## 🖥️ Option 2: Run from Windows (Local Machine)

### Prerequisites
- AWS CLI installed on Windows
- AWS credentials configured (Access Key + Secret)
- PowerShell

### Run Script

```powershell
# 1. Navigate to scripts directory
cd C:\Users\venum\IdeaProjects\CURRENT\scripts

# 2. Run PowerShell script
.\Create-SSMParameters.ps1 -Environment dev -Region us-east-1
```

**Expected output:**
```
════════════════════════════════════════════════════════════════
🔄 Creating AWS SSM Parameters for broandbro Backend
Environment: dev
Region: us-east-1
════════════════════════════════════════════════════════════════

📦 Database Configuration
📝 Creating: /broandbro/backend/dev/database/url
   ✅ Created
... (all parameters)

✅ SSM Parameter Store Setup Complete!
```

---

## ✅ Verify Parameters Created

### From AWS Console
1. Go to AWS Systems Manager → Parameter Store
2. Look for parameters starting with `/broandbro/backend/dev/`
3. Should see 15 parameters

### From CLI

```bash
# List all parameters
aws ssm describe-parameters \
    --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" \
    --region us-east-1 \
    --output table

# Get specific parameter (example)
aws ssm get-parameter \
    --name "/broandbro/backend/dev/database/url" \
    --region us-east-1 \
    --query 'Parameter.Value' \
    --output text
```

---

## 🚀 Next: Deploy Application

### Step 1: Rebuild (if not done)
```bash
cd C:\Users\venum\IdeaProjects\CURRENT
./gradlew :backend:bootJar -x test
```

### Step 2: Deploy
```bash
git add .
git commit -m "Add SSM parameter creation scripts"
git push origin dev

# GitHub Actions automatically:
# 1. Builds JAR
# 2. Deploys to EC2
# 3. Restarts service
```

### Step 3: Verify on EC2
```bash
ssh EC2

# Check logs
sudo journalctl -u qrapp -n 200

# Look for:
✅ "Syncing Parameters to AWS Parameter Store"
✅ "/broandbro/backend/dev/database/url"
✅ "Application started"
✅ "Tomcat started on port 8080"
```

---

## 📊 Parameter Details

| Parameter | Value | Type | Purpose |
|-----------|-------|------|---------|
| database/url | jdbc:postgresql://... | String | DB connection |
| database/username | broandbro | String | DB user |
| database/password | supplied securely at deployment time | SecureString | DB password |
| razorpay/key | rzp_test_... | String | Payment key |
| razorpay/secret | rzp_test_... | SecureString | Payment secret |
| razorpay/webhookSecret | (empty) | SecureString | Webhook (optional) |
| aws/s3/enabled | true | String | Enable S3 |
| aws/s3/bucketName | broandbro-menu-... | String | S3 bucket |
| aws/s3/region | us-east-1 | String | S3 region |
| aws/s3/accessKey | AKIA... | SecureString | S3 access key |
| aws/s3/secretKey | Y7wq... | SecureString | S3 secret key |
| twilio/accountSid | AC... | SecureString | Twilio account |
| twilio/authToken | 8c98... | SecureString | Twilio token |
| openai/apiKey | sk-proj-... | SecureString | OpenAI API key |
| app/corsAllowedOrigins | https://develop... | String | CORS origins |

---

## 🔒 Security Notes

- **SecureString** parameters are encrypted at rest
- Only EC2 instance with proper IAM role can access
- All sensitive data (passwords, API keys) are SecureString type
- Parameters are versioned automatically

---

## 🆘 Troubleshooting

### Error: "User is not authorized to perform: ssm:PutParameter"
**Cause:** EC2 IAM role missing SSM permissions
**Fix:** 
```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:PutParameter",
    "ssm:GetParameter",
    "ssm:DeleteParameter",
    "ssm:DescribeParameters"
  ],
  "Resource": "arn:aws:ssm:*:*:parameter/broandbro/backend/dev/*"
}
```

### Error: "Parameter name is invalid"
**Cause:** Parameter name has invalid characters
**Fix:** Parameter names use forward slash (/) separator - already correct in script

### Application still not reading parameters
**Cause:** 
1. Application not restarted after parameters created
2. Application profile not set to dev
3. SSM parameter store not properly imported

**Fix:**
```bash
# On EC2, restart service
sudo systemctl restart broandbro

# Verify
sudo journalctl -u broandbro -n 50 | grep -i "parameter\|syncing"
```

---

## 📝 Script Files

```
scripts/
├── create-ssm-parameters.sh    # Bash script (for EC2)
└── Create-SSMParameters.ps1    # PowerShell script (for Windows)
```

---

## ✅ Checklist

- [ ] Prerequisites checked
- [ ] Script chosen (EC2 or Windows)
- [ ] Script run successfully
- [ ] Parameters verified in AWS Console
- [ ] Application restarted on EC2
- [ ] Logs show "Syncing Parameters"
- [ ] Database connection successful
- [ ] All services working

---

**Ready to create parameters!** 🚀

Choose your option:
- **EC2:** Run `/tmp/create-ssm-parameters.sh`
- **Windows:** Run `.\Create-SSMParameters.ps1`
