# 🎬 AWS Parameter Store - ACTION PLAN

## ✅ IMPLEMENTATION COMPLETE

All code, scripts, and documentation are ready. Here's exactly what to do:

---

## 📋 YOUR CHECKLIST (Do These)

### ✅ Phase 1: Local Setup (5 minutes)

- [ ] Open terminal/PowerShell on your machine
- [ ] Navigate to project: `cd C:\Users\venum\IdeaProjects\CURRENT`
- [ ] Verify AWS CLI: `aws sts get-caller-identity`
  - Should show your AWS account info
  - If error, install AWS CLI and configure credentials

### ✅ Phase 2: Populate Parameter Store (2 minutes)

```bash
bash infra/aws-parameter-store-auto-setup.sh dev us-east-1
```

**Wait for:**
```
════════════════════════════════════════════════════════════════
✅ Parameter Store Setup Complete!
════════════════════════════════════════════════════════════════
```

**That's it!** All secrets are now in AWS Parameter Store.

### ✅ Phase 3: Verify IAM Role (3 minutes)

1. Go to **AWS Console** → **EC2** → **Instances**
2. Find instance: `i-0f2ba63193349f4af`
3. Click → **Security** → **IAM Role**
4. Go to **Permissions** → **Add Inline Policy** → **JSON**
5. Paste this:
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
6. Click **Create Policy**

✅ EC2 can now read secrets from Parameter Store

### ✅ Phase 4: Rebuild Backend (3 minutes)

```bash
cd backend
./gradlew bootJar -x test
```

Wait for: `BUILD SUCCESSFUL`

The JAR now includes Parameter Store support.

### ✅ Phase 5: Deploy Backend (via GitHub Actions or Manual)

**Option A: GitHub Actions (Recommended)**
- Push code to GitHub
- GitHub Actions automatically builds and deploys
- Backend automatically reads from Parameter Store

**Option B: Manual Deploy**
```bash
# Upload backend/build/libs/qrapp-*.jar to EC2
scp -i key.pem backend/build/libs/qrapp-*.jar ec2-user@EC2_IP:/opt/app/

# SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# Restart service
sudo systemctl restart qrapp
```

### ✅ Phase 6: Verify It Works (2 minutes)

```bash
# SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# Check logs
sudo journalctl -u qrapp -n 50 | grep -i "parameter store\|✅ LOADED"
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
Razorpay Secret: ✅ LOADED
S3 Enabled: ✅ LOADED
...
```

✅ Everything working!

---

## 📊 Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Verify AWS CLI | 1 min | ⏳ |
| 2. Run setup script | 2 min | ⏳ |
| 3. Update IAM role | 3 min | ⏳ |
| 4. Rebuild backend | 3 min | ⏳ |
| 5. Deploy backend | 5 min | ⏳ |
| 6. Verify logs | 2 min | ⏳ |
| **TOTAL** | **~16 min** | ⏳ |

---

## 🔐 What Happens After

### For Development
- Frontend still works normally
- Backend reads secrets from Parameter Store
- No GitHub secrets exposed

### For Operations
- **Rotate a secret:** Update in Parameter Store, restart backend (no Git commits!)
- **Add new secret:** Add to Parameter Store, restart backend
- **Audit access:** Check CloudTrail for all reads

### For Security
- All secrets encrypted with AWS KMS
- IAM role controls access
- Full audit trail available
- Complies with enterprise standards

---

## 🆘 If You Get Stuck

### Issue: AWS CLI not found
```bash
# Install AWS CLI v2
# Windows: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
# Or: pip install awscli

# Configure credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output (json)
```

### Issue: Permission denied on Parameter Store
```bash
# Check IAM role attached to EC2
# Go to AWS Console → EC2 → Instances → i-0f2ba63193349f4af
# → Security tab → Add inline policy (see Phase 3 above)
```

### Issue: Backend not loading parameters
```bash
# SSH to EC2 and check logs
ssh -i key.pem ec2-user@EC2_IP
sudo journalctl -u qrapp -n 100 | grep -i parameter

# If you see errors about permission denied:
# Update IAM role (Phase 3) and restart backend
sudo systemctl restart qrapp
```

### Issue: Parameters not created
```bash
# Verify parameters exist
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" \
  --region us-east-1

# If empty, run setup script again
bash infra/aws-parameter-store-auto-setup.sh dev us-east-1
```

---

## 📞 Need Help?

### Check Documentation
1. **Quick start:** `PARAMETER_STORE_QUICK_START.md`
2. **Full guide:** `AWS_PARAMETER_STORE_SETUP.md`
3. **This document:** You're reading it!

### Verify Setup
```bash
# 1. Parameters created?
aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" --region us-east-1

# 2. EC2 can read them?
ssh to EC2 and check: sudo systemctl status qrapp

# 3. Backend logs?
sudo journalctl -u qrapp -n 50 | grep -i parameter
```

---

## ✨ Key Points

- ✅ **No secrets in GitHub anymore**
- ✅ **Centralized in AWS Parameter Store**
- ✅ **Fully encrypted with AWS KMS**
- ✅ **Easy to rotate** (no Git commits needed)
- ✅ **Full audit trail** via CloudTrail
- ✅ **Free** (standard tier)
- ✅ **Takes 16 minutes** to fully deploy

---

## 🎯 Success Criteria

After following this plan, you'll know everything works when:

✅ Setup script completes successfully  
✅ `aws ssm describe-parameters` shows 15+ parameters  
✅ EC2 has IAM permissions added  
✅ Backend JAR rebuilt  
✅ Backend deployed to EC2  
✅ Backend logs show "✅ LOADED" for all parameters  
✅ API endpoints respond normally  

---

## 🚀 NOW DO THIS

**Right now, open terminal and run:**

```bash
cd C:\Users\venum\IdeaProjects\CURRENT
bash infra/aws-parameter-store-auto-setup.sh dev us-east-1
```

This is the first step. It takes 2 minutes. Go!

---

**Status:** ✅ Ready to Execute  
**Complexity:** Low  
**Risk:** Minimal (backward compatible)  
**Benefit:** Enterprise-grade secret management  

**Let's go! 🚀**

