# AWS Parameter Store - Auto-Create Feature

## 🎯 What This Does

**Automatically creates all parameters in AWS Parameter Store during application startup** - No manual setup scripts needed!

```
Application Start
    ↓
Spring Boot initializes
    ↓
ParameterStoreAutoSync reads app.parameters from YAML
    ↓
Automatically creates/updates all parameters in AWS
    ↓
Application logs show which parameters were created
    ↓
Application ready to use
```

---

## 🚀 How to Use

### Step 1: Define Parameters in YAML

Edit `backend/src/main/resources/application-dev.yml`:

```yaml
app:
  parameter-store:
    auto-create: true  # ✅ Enable auto-create
    environment: dev
  
  parameters:
    database:
      url: jdbc:postgresql://...
      username: user
      password: pass
    
    razorpay:
      key: rzp_test_123
      secret: secret_123
```

### Step 2: Ensure EC2 IAM Role Has Permissions

EC2 needs permission to create parameters:

```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:PutParameter",
    "ssm:GetParameter*"
  ],
  "Resource": "arn:aws:ssm:us-east-1:*:parameter/broandbro/backend/dev/*"
}
```

### Step 3: Deploy Backend

```bash
cd backend
./gradlew bootJar -x test
# Deploy JAR to EC2
```

### Step 4: Check Logs

After application starts:

```bash
ssh to EC2
sudo journalctl -u qrapp -n 50 | grep "Syncing Parameters\|✅"
```

**Expected output:**
```
════════════════════════════════════════════════════════════════
🔄 Syncing Parameters to AWS Parameter Store
Environment: dev | Region: us-east-1
════════════════════════════════════════════════════════════════
  ✅ /broandbro/backend/dev/database/url
  ✅ /broandbro/backend/dev/database/username
  ✅ /broandbro/backend/dev/database/password
  ✅ /broandbro/backend/dev/razorpay/key
  ✅ /broandbro/backend/dev/razorpay/secret
  ...
════════════════════════════════════════════════════════════════
✅ Parameter Store Sync Complete! (15 parameters)
════════════════════════════════════════════════════════════════
```

---

## 📝 How to Add New Parameters

### Method 1: Add to YAML (Easiest)

Edit `application-dev.yml`:

```yaml
app:
  parameters:
    stripe:  # ← New section
      apiKey: sk_test_123
      publicKey: pk_test_123
```

On next application startup, these parameters are automatically created in AWS!

### Method 2: Update via AWS CLI

```bash
# Manually update a parameter
aws ssm put-parameter \
  --name "/broandbro/backend/dev/stripe/apiKey" \
  --value "sk_test_NEW_VALUE" \
  --type "SecureString" \
  --overwrite \
  --region us-east-1
```

### Method 3: Use in Code

```java
@Autowired
private ParameterStoreDefinitions definitions;

// Later in code:
String stripeKey = definitions.getStripe().getApiKey();
```

---

## 🔧 Code Structure

### Three New Files

**1. `ParameterStoreDefinitions.java`**
```java
// Defines structure of all parameters
@ConfigurationProperties(prefix = "app.parameters")
public class ParameterStoreDefinitions {
    private DatabaseConfig database;
    private RazorpayConfig razorpay;
    // ... etc
}
```

**2. `ParameterStoreAutoSync.java`**
```java
// Automatically creates parameters on startup
@EventListener(ContextRefreshedEvent.class)
public void initializeParameters() {
    // Syncs all app.parameters to AWS Parameter Store
}
```

**3. `AwsSdkConfig.java`**
```java
// Provides SsmClient bean for AWS operations
@Bean
public SsmClient ssmClient() {
    return SsmClient.builder().build();
}
```

---

## 🎯 Configuration Reference

### Enable/Disable Auto-Create

```yaml
app:
  parameter-store:
    auto-create: true   # Enable in dev
    environment: dev    # Environment name
```

### Define Parameters

```yaml
app:
  parameters:
    
    # Section: database
    database:
      url: jdbc:postgresql://...
      username: user
      password: pass
    
    # Section: razorpay
    razorpay:
      key: rzp_key
      secret: rzp_secret
      webhookSecret: whsec_secret
    
    # Section: aws > s3
    aws:
      s3:
        enabled: true
        bucketName: bucket
        region: us-east-1
        accessKey: AKIA...
        secretKey: ...
    
    # Section: twilio
    twilio:
      accountSid: ACxxx
      authToken: xxx
    
    # Section: openai
    openai:
      apiKey: sk-xxx
    
    # Section: app
    app:
      corsAllowedOrigins: https://example.com,http://localhost:5173
```

---

## 📊 What Gets Created in AWS

When auto-create is enabled and application starts:

```
/broandbro/backend/dev/database/url (String)
/broandbro/backend/dev/database/username (String)
/broandbro/backend/dev/database/password (SecureString) 🔐
/broandbro/backend/dev/razorpay/key (SecureString) 🔐
/broandbro/backend/dev/razorpay/secret (SecureString) 🔐
/broandbro/backend/dev/razorpay/webhookSecret (SecureString) 🔐
/broandbro/backend/dev/aws/s3/enabled (String)
/broandbro/backend/dev/aws/s3/bucketName (String)
/broandbro/backend/dev/aws/s3/region (String)
/broandbro/backend/dev/aws/s3/accessKey (SecureString) 🔐
/broandbro/backend/dev/aws/s3/secretKey (SecureString) 🔐
/broandbro/backend/dev/twilio/accountSid (String)
/broandbro/backend/dev/twilio/authToken (SecureString) 🔐
/broandbro/backend/dev/openai/apiKey (SecureString) 🔐
/broandbro/backend/dev/app/corsAllowedOrigins (String)
```

**Total:** 15 parameters, 9 encrypted with AWS KMS

---

## ✅ Advantages

✅ **No manual setup** - Just set `auto-create: true`  
✅ **Version controlled** - Parameters defined in YAML  
✅ **Automatic sync** - Updates on every application start  
✅ **Safe** - Can't break anything (just overwrites)  
✅ **Auditable** - See when parameters were created/updated  
✅ **Easy to add** - Just add to YAML, redeploy  
✅ **No scripts** - No need to run separate setup scripts  

---

## ⚙️ How It Works Internally

1. **Application starts**
   - Spring Boot loads `application.yml` + `application-dev.yml`

2. **ParameterStoreDefinitions bean created**
   - Spring injects values from `app.parameters` section
   - Mapped to Java objects (DatabaseConfig, RazorpayConfig, etc.)

3. **AwsSdkConfig bean created**
   - Creates SsmClient for AWS operations

4. **ParameterStoreAutoSync bean created**
   - Registers listener for ContextRefreshedEvent

5. **Application context ready**
   - Event fired: `ContextRefreshedEvent`

6. **ParameterStoreAutoSync triggered**
   - Reads all parameters from ParameterStoreDefinitions
   - Creates/updates each parameter in AWS via SsmClient
   - Logs "✅ /broandbro/backend/dev/..." for each one

7. **Application ready**
   - All parameters in AWS
   - Application can read them or use local values

---

## 🔄 Update Flow

```
YAML Change
    ↓
app.parameters section updated
    ↓
Rebuild backend
    ↓
Deploy to EC2
    ↓
Application starts
    ↓
ParameterStoreAutoSync detects changes
    ↓
Overwrites parameters in AWS
    ↓
Application uses new values
    ↓
✅ Done!
```

---

## 🆘 Troubleshooting

### Parameters not created?

```bash
# Check if auto-create is enabled
grep "auto-create" backend/src/main/resources/application-dev.yml
# Should show: auto-create: true

# Check logs for errors
sudo journalctl -u qrapp -n 50 | grep -i "error\|parameter"

# Check EC2 IAM role has permissions
aws iam get-role-policy --role-name EC2Role --policy-name ParameterStorePolicy
```

### Permission denied?

```bash
# Add missing permissions to EC2 IAM role
# Go to AWS Console → EC2 → Security → IAM Role
# Add inline policy with ssm:PutParameter action
```

### Parameters already exist?

That's fine! Auto-sync **overwrites** existing parameters with current values. It's safe to run multiple times.

---

## 🎓 Key Points

- **Auto-create is optional** - Can disable by setting `auto-create: false`
- **Works with fallbacks** - If auto-create fails, app still reads from env vars or defaults
- **Version controlled** - All parameter values in Git (even if encrypted in AWS)
- **Per-environment** - Dev, staging, prod can have different values
- **No additional cost** - Just uses same Parameter Store billing

---

## 📚 Files Modified

| File | Change |
|------|--------|
| `application.yml` | Added parameter-store config section |
| `application-dev.yml` | Defined all dev parameters |
| `build.gradle` | Already has AWS SDK dependency |

## 📚 New Files Created

| File | Purpose |
|------|---------|
| `ParameterStoreDefinitions.java` | Defines parameter structure |
| `ParameterStoreAutoSync.java` | Auto-creates parameters |
| `AwsSdkConfig.java` | Provides SsmClient bean |

---

## 🎯 Summary

**Before:** Manual setup script + Git secrets ❌  
**After:** Automatic parameter sync via YAML ✅

Just enable `auto-create: true` and deploy. Everything is handled automatically!

---

**Status:** ✅ Ready to Use  
**Next Step:** Deploy backend with `auto-create: true` enabled

