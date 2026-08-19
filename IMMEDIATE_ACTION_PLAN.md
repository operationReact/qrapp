# 🚀 IMMEDIATE ACTION PLAN - Create SSM Parameters

**Status:** ✅ Scripts Ready to Use  
**Next Step:** Run one of the scripts to create all 15 parameters  

---

## ⚡ Quick Start

### Option 1: Run from EC2 (Recommended - Fastest)

```bash
# On your local machine:
scp -i key.pem scripts/create-ssm-parameters.sh ec2-user@EC2_IP:/tmp/

# Then SSH to EC2:
ssh -i key.pem ec2-user@EC2_IP
chmod +x /tmp/create-ssm-parameters.sh
/tmp/create-ssm-parameters.sh
```

**Time:** ~1 minute  
**Result:** All 15 parameters created ✅

### Option 2: Run from Windows

```powershell
cd C:\Users\venum\IdeaProjects\CURRENT\scripts
.\Create-SSMParameters.ps1 -Environment dev -Region us-east-1
```

**Time:** ~1 minute  
**Result:** All 15 parameters created ✅

---

## ✅ What Gets Created

**15 Total Parameters:**

```
Database (3)
├── /broandbro/backend/dev/database/url
├── /broandbro/backend/dev/database/username
└── /broandbro/backend/dev/database/password

Razorpay (3)
├── /broandbro/backend/dev/razorpay/key
├── /broandbro/backend/dev/razorpay/secret
└── /broandbro/backend/dev/razorpay/webhookSecret

AWS S3 (5)
├── /broandbro/backend/dev/aws/s3/enabled
├── /broandbro/backend/dev/aws/s3/bucketName
├── /broandbro/backend/dev/aws/s3/region
├── /broandbro/backend/dev/aws/s3/accessKey
└── /broandbro/backend/dev/aws/s3/secretKey

Twilio (2)
├── /broandbro/backend/dev/twilio/accountSid
└── /broandbro/backend/dev/twilio/authToken

OpenAI (1)
└── /broandbro/backend/dev/openai/apiKey

App Config (1)
└── /broandbro/backend/dev/app/corsAllowedOrigins
```

---

## 🔄 After Creating Parameters

### Step 1: Restart Application (On EC2)
```bash
sudo systemctl restart broandbro
```

### Step 2: Verify Logs (On EC2)
```bash
sudo journalctl -u broandbro -n 200

Look for:
✅ "🔄 Syncing Parameters to AWS Parameter Store"
✅ "✅ Parameter Store Sync Complete"
✅ "Application started in X seconds"
✅ "Tomcat started on port 8080"
```

### Step 3: Test Connection
```bash
# Should connect to correct database now
curl http://localhost:8080/swagger-ui.html

# Check logs for database connection success
sudo journalctl -u broandbro -n 50 | grep -i "database\|flyway"

Should see:
✅ Flyway version X
✅ Successfully validated database
✅ No connection errors
```

---

## 📊 Expected Result

**Before Creating Parameters:**
```
java.net.UnknownHostException: broandbro-dev.chi2yu0m6hp0.us-east-1.rds.amazonaws.com
(Using wrong database from GitHub secrets)
```

**After Creating Parameters:**
```
✅ Successfully validated database
✅ Flyway: validating schema
✅ Connected to broandbro_dev database
✅ All migrations applied
✅ Application ready
```

---

## 📁 Files Available

```
scripts/
├── create-ssm-parameters.sh      ← Run on EC2 (bash)
└── Create-SSMParameters.ps1      ← Run on Windows (PowerShell)

Guides/
├── SSM_PARAMETER_SETUP_GUIDE.md  ← Complete guide
└── DEPLOYMENT_ACTION_PLAN.md     ← Deployment steps
```

---

## ⏱️ Timeline

```
Run Script (1 min)
    ↓
Parameters Created (0 min - automatic)
    ↓
Verify in AWS Console (1 min)
    ↓
Restart Application (1 min)
    ↓
Check Logs (1 min)
    ↓
✅ All Done!
```

**Total Time:** ~5 minutes

---

## 🎯 Choose Your Path

### Path A: Run from EC2 (Fastest)
```
1. Upload script to EC2
2. SSH to EC2
3. Run: /tmp/create-ssm-parameters.sh
4. Done! ✅
```

### Path B: Run from Windows
```
1. Open PowerShell
2. Navigate to scripts folder
3. Run: .\Create-SSMParameters.ps1
4. Done! ✅
```

---

## 🆘 Need Help?

See `SSM_PARAMETER_SETUP_GUIDE.md` for:
- Detailed step-by-step instructions
- Troubleshooting guide
- Verification procedures
- Parameter details

---

## ✅ Checklist

- [ ] Choose Option 1 (EC2) or Option 2 (Windows)
- [ ] Run the appropriate script
- [ ] See "✅ All parameters created!" message
- [ ] Verify in AWS Console
- [ ] Restart application on EC2
- [ ] Check logs for "Syncing Parameters"
- [ ] Test database connection
- [ ] All working! ✅

---

**Ready? Run the script now!** 🚀

```bash
# EC2:
/tmp/create-ssm-parameters.sh

# Windows:
.\Create-SSMParameters.ps1
```

