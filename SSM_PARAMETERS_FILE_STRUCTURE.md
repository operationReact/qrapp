# Dedicated SSM Parameters Files - Structure & Usage

## 📁 File Structure

```
backend/src/main/resources/
├── application.yml                  (Base configuration - shared across all environments)
├── application-dev.yml              (Dev profile - application behavior)
├── application-ssm.yml              (Default SSM parameter values)
├── application-ssm-dev.yml          (Dev environment SSM parameters) ⭐ NEW
├── application-ssm-staging.yml      (Staging environment parameters - create as needed)
└── application-ssm-prod.yml         (Production environment parameters - create as needed)
```

## 🎯 Purpose of Each File

### `application-ssm.yml`
**Default/Base parameter values** that apply to all environments.
```yaml
app:
  parameter-store:
    environment: default
  parameters:
    database:
      url: jdbc:postgresql://localhost:5432/postgres
      username: postgres
      password: password
```

### `application-ssm-dev.yml`
**Dev-specific parameter values** - overrides `application-ssm.yml` when `spring.profiles.active=dev`
```yaml
app:
  parameter-store:
    auto-create: true  # Enable auto-create in dev
    environment: dev
  parameters:
    database:
      url: jdbc:postgresql://broandbro-dev.csjkasgs2ig6.us-east-1.rds.amazonaws.com:5432/postgres
      username: BROANDBRODEV
      password: BroApp#2025
```

### `application-dev.yml`
**Dev profile application configuration** - controls app behavior, not SSM parameters
```yaml
spring:
  cache:
    type: caffeine
  datasource:
    url: ${app.parameter-store.database.url:...}
```

## 🔄 Configuration Loading Order

When Spring Boot starts with `spring.profiles.active=dev`:

```
1. Load application.yml (base)
   ↓
2. Load application-dev.yml (dev profile - app behavior)
   ↓
3. Load application-ssm.yml (base SSM parameters)
   ↓
4. Load application-ssm-dev.yml (dev SSM parameters - OVERRIDES step 3)
   ↓
5. Merge all configurations
   ↓
6. ParameterStoreAutoSync triggered
   ↓
7. Parameters from step 5 synced to AWS
```

**Result:** Dev-specific parameters are used, which override defaults.

## ✅ Advantages of This Structure

✅ **Clear separation** - App config vs SSM parameters  
✅ **Easy to add environments** - Just create new file  
✅ **Organized** - All parameters in one place per environment  
✅ **Version controlled** - All in Git  
✅ **Discoverable** - Easy to see what parameters exist  
✅ **Maintainable** - Change one file to update environment  
✅ **DRY** - No duplication between files  

## 📝 How to Use

### View All Parameters for Dev
```bash
cat backend/src/main/resources/application-ssm-dev.yml
```

### Add New Parameter to Dev
**Edit:** `application-ssm-dev.yml`
```yaml
app:
  parameters:
    stripe:  # ← New section
      apiKey: sk_test_123
      secretKey: sk_secret_456
```

Redeploy → Parameters automatically created on startup ✅

### Add New Environment (e.g., Staging)

**1. Create file:** `application-ssm-staging.yml`
```yaml
app:
  parameter-store:
    auto-create: true
    environment: staging
  
  parameters:
    database:
      url: jdbc:postgresql://broandbro-staging.rds.amazonaws.com:5432/postgres
      username: BROANDBROSTA
      password: StgPassword#2025
    
    razorpay:
      key: rzp_live_staging_key
      secret: rzp_live_staging_secret
    
    # ... other parameters
```

**2. Create file:** `application-staging.yml`
```yaml
spring:
  cache:
    type: caffeine
  datasource:
    url: ${app.parameter-store.database.url}
    username: ${app.parameter-store.database.username}
    password: ${app.parameter-store.database.password}

# ... rest of config
```

**3. Deploy with profile:**
```bash
# Set environment variable
export SPRING_PROFILES_ACTIVE=staging

# Or in CI/CD
java -jar app.jar --spring.profiles.active=staging
```

✅ Staging parameters loaded from `application-ssm-staging.yml`

## 🔍 File Locations

All SSM parameter files are located in:
```
backend/src/main/resources/
```

They are automatically loaded by Spring based on the active profile.

## 📊 Comparison: Before vs After

### Before (Everything in application-dev.yml)
```yaml
# application-dev.yml - Messy mix of everything
spring:
  datasource:
    url: ...
app:
  parameter-store:
    auto-create: true
  parameters:  # ← All 15+ parameters here
    database: ...
    razorpay: ...
    aws: ...
    # etc
```

**Issues:**
- ❌ Hard to find parameters
- ❌ Hard to compare environments
- ❌ Mixed concerns (app config + parameters)
- ❌ Hard to add new environment

### After (Dedicated parameter file)
```
application-dev.yml
├─ Spring config (datasource, cache, etc.)
└─ No parameters here!

application-ssm-dev.yml
├─ All 15+ parameters organized by service
├─ Easy to read
├─ Easy to update
└─ Easy to compare with other environments
```

**Benefits:**
- ✅ Clear separation
- ✅ Easy to find things
- ✅ Easy to add new environments
- ✅ Single source of truth for parameters
- ✅ Better maintainability

## 🎯 Quick Reference: How to Update Parameters

### Change Existing Parameter
```bash
# 1. Edit application-ssm-dev.yml
#    Change: database.password: NewPassword#2025

# 2. Rebuild
./gradlew bootJar -x test

# 3. Deploy
git push

# 4. On startup:
#    Parameter updated in AWS automatically ✅
```

### Add New Parameter
```bash
# 1. Edit application-ssm-dev.yml
#    Add:
#    stripe:
#      apiKey: sk_test_123

# 2. Rebuild
./gradlew bootJar -x test

# 3. Deploy
git push

# 4. On startup:
#    Parameter created in AWS automatically ✅
```

### Create New Environment
```bash
# 1. Create application-ssm-prod.yml
#    Copy from application-ssm-dev.yml
#    Update values for production

# 2. Create application-prod.yml
#    Copy from application-dev.yml
#    Update app-specific config

# 3. Deploy with:
#    spring.profiles.active=prod

# 4. Production parameters created in AWS ✅
```

## 🔐 What Gets Created in AWS

When application starts with `spring.profiles.active=dev`:

```
AWS Parameter Store
├─ /broandbro/backend/dev/database/...      (from application-ssm-dev.yml)
├─ /broandbro/backend/dev/razorpay/...      (from application-ssm-dev.yml)
├─ /broandbro/backend/dev/aws/s3/...        (from application-ssm-dev.yml)
├─ /broandbro/backend/dev/twilio/...        (from application-ssm-dev.yml)
├─ /broandbro/backend/dev/openai/...        (from application-ssm-dev.yml)
└─ /broandbro/backend/dev/app/cors/...      (from application-ssm-dev.yml)
```

All values come from `application-ssm-dev.yml` ✅

## ✅ Checklist

- [ ] `application-ssm.yml` created (base defaults)
- [ ] `application-ssm-dev.yml` created (dev parameters)
- [ ] `application-dev.yml` cleaned up (no parameters)
- [ ] Backend rebuilt
- [ ] Code pushed
- [ ] Application deployed
- [ ] Logs show "✅ Parameter Store Sync Complete"
- [ ] Parameters in AWS Point to values from application-ssm-dev.yml

## 📚 Files for Reference

| File | Purpose |
|------|---------|
| `application-ssm.yml` | Default parameters |
| `application-ssm-dev.yml` | Dev-specific parameters |
| `application-dev.yml` | Dev app configuration (NO parameters) |
| `application.yml` | Base configuration (NO parameters) |

---

**Status:** ✅ Ready to Use  
**Next Step:** Rebuild and deploy backend

