# 🚀 DEPLOYMENT ACTION PLAN

**Status:** Ready to Deploy  
**Expected Outcome:** Application reads from SSM, not GitHub secrets  

---

## ✅ What Was Fixed

**Change:** All application configuration now reads from SSM Parameter Store

**Files Changed:**
```
✅ backend/src/main/resources/application-dev.yml
   - Database URL: ${app.parameter-store.database.url}
   - Razorpay: ${app.parameter-store.razorpay.*}
   - AWS S3: ${app.parameter-store.aws.s3.*}
   - OpenAI: ${app.parameter-store.openai.apiKey}
   - All other configs from SSM
```

---

## 🚀 Step 1: Rebuild Locally

```bash
cd C:\Users\venum\IdeaProjects\CURRENT
./gradlew :backend:bootJar -x test
```

**Expected output:**
```
BUILD SUCCESSFUL
```

---

## 🚀 Step 2: Commit & Push

```bash
git add backend/src/main/resources/application-dev.yml
git commit -m "Configure application to read ONLY from SSM Parameter Store, not GitHub secrets"
git push origin dev
```

---

## 🚀 Step 3: Wait for GitHub Actions

GitHub Actions automatically:
1. Builds JAR ✅
2. Uploads to S3 ✅
3. Deploys to EC2 ✅
4. Restarts service ✅

---

## ✅ Step 4: Verify on EC2

```bash
# SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# Check logs
sudo journalctl -u qrapp -n 200

# Look for:
✅ "Syncing Parameters to AWS Parameter Store"
✅ "/broandbro/backend/dev/database/url"
✅ "/broandbro/backend/dev/razorpay/key"
✅ "Application started"
```

---

## 🎯 Expected Results

**Before Fix:**
```
java.net.UnknownHostException: the previous RDS endpoint
(Trying to connect to wrong database - from GitHub secrets)
```

**After Fix:**
```
✅ Connected to correct database from SSM Parameter Store
✅ All services configured from SSM
✅ Application running
```

---

## 📊 What Gets Used Now

| Service | Source | Before | After |
|---------|--------|--------|-------|
| Database | SSM | ❌ GitHub secrets | ✅ SSM |
| Razorpay | SSM | ❌ GitHub secrets | ✅ SSM |
| AWS S3 | SSM | ❌ GitHub secrets | ✅ SSM |
| OpenAI | SSM | ❌ GitHub secrets | ✅ SSM |

---

## 🔧 If Issues Occur

### Issue: Still connecting to wrong database

**Check:**
```bash
# 1. Verify application-ssm-dev.yml has correct URL
cat backend/src/main/resources/application-ssm-dev.yml | grep -A 5 database:

# 2. Verify EC2 has parameter store enabled
aws ssm describe-parameters --parameter-filters "Key=Name,Values=/broandbro/backend/dev/database" --region us-east-1

# 3. Check EC2 IAM role has SSM permissions
```

### Issue: Parameter Store not syncing

**Check logs:**
```bash
sudo journalctl -u qrapp -n 50 | grep -i "parameter\|syncing"

Look for:
✅ "ParameterStoreAutoSync triggered"
✅ "Syncing Parameters"
❌ Any AWS authentication errors
```

---

## ✅ Deployment Checklist

- [ ] Rebuild locally successful
- [ ] Code committed and pushed
- [ ] GitHub Actions completed
- [ ] EC2 logs show "Syncing Parameters"
- [ ] Database connection successful
- [ ] Application running
- [ ] All services working

---

## 📞 Quick Reference

**Rebuild:**
```bash
./gradlew :backend:bootJar -x test
```

**Deploy:**
```bash
git push origin dev
```

**Verify:**
```bash
ssh EC2 && sudo journalctl -u qrapp -n 200 | tail -50
```

**Expected Pattern:**
```
✅ 🔄 Syncing Parameters to AWS Parameter Store
✅ Environment: dev
✅ /broandbro/backend/dev/database/url
✅ Application started in X seconds
✅ Tomcat started on port 8080
```

---

**Ready to deploy! 🚀**
