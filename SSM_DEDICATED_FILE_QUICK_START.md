# 🎯 Dedicated SSM Parameters File - Quick Start

## ✅ What I've Created

**Dedicated, organized files for SSM parameters by environment:**

```
✅ application-ssm.yml          (Default parameters for all environments)
✅ application-ssm-dev.yml      (Dev-specific parameters) ⭐ THIS IS YOUR MAIN FILE
```

---

## 📂 File Structure

```
backend/src/main/resources/
│
├─ application.yml              (Base app config)
├─ application-dev.yml          (Dev app behavior - NO parameters)
│
├─ application-ssm.yml          (Default SSM parameters)
├─ application-ssm-dev.yml      (Dev SSM parameters) ⭐ MAIN FILE
│
└─ (Create more as needed)
   ├─ application-ssm-staging.yml  (For staging)
   └─ application-ssm-prod.yml     (For production)
```

---

## 🚀 How to Use

### View All Dev Parameters
```bash
cat backend/src/main/resources/application-ssm-dev.yml
```

Shows:
```yaml
app:
  parameters:
    database:
      url: jdbc:postgresql://...
      username: BROANDBRODEV
      password: BroApp#2025
    razorpay:
      key: rzp_test_...
      secret: ...
    aws:
      s3:
        bucketName: broandbro-dev-root-bucket
        accessKey: AKIA...
        secretKey: ...
    # ... all 15+ parameters
```

### Update a Parameter

**Example: Change database password**

1. **Edit file:**
   ```bash
   vim backend/src/main/resources/application-ssm-dev.yml
   ```

2. **Change value:**
   ```yaml
   database:
     password: NewPassword#2025  # ← Update this
   ```

3. **Rebuild:**
   ```bash
   ./gradlew bootJar -x test
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Update dev database password"
   git push origin dev
   ```

5. **On startup:**
   - New value automatically synced to AWS Parameter Store ✅
   - Logs show: `✅ /broandbro/backend/dev/database/password`

### Add New Parameter

**Example: Add Stripe integration**

1. **Edit:** `application-ssm-dev.yml`
   ```yaml
   app:
     parameters:
       stripe:  # ← New section
         apiKey: sk_test_123
         secretKey: sk_secret_456
         webhookSecret: whsec_test_789
   ```

2. **Update Java class** (Optional - only if you want to use it in code)
   ```java
   // ParameterStoreDefinitions.java
   @Data
   public static class StripeConfig {
       private String apiKey;
       private String secretKey;
       private String webhookSecret;
   }
   
   // In main class:
   private StripeConfig stripe;
   ```

3. **Rebuild & deploy:**
   ```bash
   ./gradlew bootJar
   git push
   ```

4. **Automatic on startup:**
   ```
   ✅ /broandbro/backend/dev/stripe/apiKey
   ✅ /broandbro/backend/dev/stripe/secretKey
   ✅ /broandbro/backend/dev/stripe/webhookSecret
   ```

### Create New Environment (Staging)

1. **Create:** `application-ssm-staging.yml`
   ```yaml
   app:
     parameter-store:
       auto-create: true
       environment: staging
     
     parameters:
       database:
         url: jdbc:postgresql://broandbro-staging.rds.amazonaws.com/postgres
         username: BROANDBROSTA
         password: StgPassword#2025
       
       razorpay:
         key: rzp_live_staging_key
         secret: rzp_live_staging_secret
       
       # ... update other values for staging
   ```

2. **Create:** `application-staging.yml`
   ```yaml
   spring:
     datasource:
       url: ${app.parameter-store.database.url}
       username: ${app.parameter-store.database.username}
       password: ${app.parameter-store.database.password}
   ```

3. **Deploy with staging profile:**
   ```bash
   java -jar app.jar --spring.profiles.active=staging
   ```

4. **Staging parameters created in AWS:**
   ```
   /broandbro/backend/staging/database/url
   /broandbro/backend/staging/database/username
   /broandbro/backend/staging/database/password
   # ... etc
   ```

---

## ✨ Key Features

✅ **Organized** - All parameters in one file per environment  
✅ **Easy to read** - Grouped by service (database, razorpay, aws, etc.)  
✅ **Easy to modify** - Change one file, deploy, automatic update  
✅ **Easy to add** - Create new file for new environment  
✅ **Version controlled** - All in Git  
✅ **Automatic sync** - Parameters created in AWS on startup  
✅ **No manual work** - No AWS CLI commands needed  

---

## 📋 Parameter Organization

All parameters organized by service:

```yaml
app:
  parameters:
    
    # Database
    database:
      url: ...
      username: ...
      password: ...
    
    # Payment
    razorpay:
      key: ...
      secret: ...
      webhookSecret: ...
    
    # Storage
    aws:
      s3:
        enabled: ...
        bucketName: ...
        region: ...
        accessKey: ...
        secretKey: ...
    
    # Communication
    twilio:
      accountSid: ...
      authToken: ...
    
    # AI
    openai:
      apiKey: ...
    
    # App Config
    app:
      corsAllowedOrigins: ...
```

Easy to find what you're looking for! 🎯

---

## 🔄 Compare Across Environments

**Compare dev vs staging parameters:**

```bash
diff -u backend/src/main/resources/application-ssm-dev.yml \
         backend/src/main/resources/application-ssm-staging.yml
```

Shows exactly which values are different ✅

---

## ⚡ Quick Commands

```bash
# View all dev parameters
cat backend/src/main/resources/application-ssm-dev.yml

# Edit dev parameters
vim backend/src/main/resources/application-ssm-dev.yml

# Rebuild after changes
./gradlew bootJar -x test

# Deploy
git add . && git commit -m "Update parameters" && git push

# Check what was created in AWS (after deployment)
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/broandbro/backend/dev" \
  --region us-east-1
```

---

## ✅ Verification

After deployment, verify everything works:

```bash
# SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# Check logs
sudo journalctl -u qrapp -n 50 | grep "Syncing Parameters"

# Should show:
# 🔄 Syncing Parameters to AWS Parameter Store
# Environment: dev | Region: us-east-1
# ✅ /broandbro/backend/dev/database/url
# ✅ /broandbro/backend/dev/database/username
# ... (all parameters from application-ssm-dev.yml)
```

---

## 🎓 Summary

| Task | Where | How |
|------|-------|-----|
| **View all parameters** | `application-ssm-dev.yml` | Read the file |
| **Update parameter** | `application-ssm-dev.yml` | Edit value + rebuild + deploy |
| **Add new parameter** | `application-ssm-dev.yml` | Add new section + rebuild + deploy |
| **Create new environment** | Create `application-ssm-{env}.yml` | Copy from dev + update values |
| **Deploy to environment** | GitHub Actions | Push code |
| **Auto-sync to AWS** | Application startup | Automatic ✅ |

---

**Status:** ✅ Ready to Use  
**Main File:** `backend/src/main/resources/application-ssm-dev.yml`  
**Next:** Rebuild and deploy!

---

## 📞 Need Help?

**Read full documentation:**
```
SSM_PARAMETERS_FILE_STRUCTURE.md
```

**Quick reference:**
- Dev params → `application-ssm-dev.yml`
- Need new env? → Create `application-ssm-{env}.yml`
- Change value? → Edit file + rebuild + deploy
- Done! ✅

