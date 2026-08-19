# Local Development Setup - AWS Parameter Store Fix

## ✅ Problem Fixed

**Error:** `Unable to load region from any of the providers in the chain`

**Cause:** Application was trying to connect to AWS Parameter Store locally without AWS credentials.

**Solution:** Created `application-local.yml` profile that disables AWS Parameter Store for local development.

---

## 🚀 How to Run Locally

### Option 1: Using IDE (IntelliJ IDEA)

**Step 1: Set Active Profile**
1. Go to **Run** → **Edit Configurations**
2. Select your run configuration (e.g., `QrappApplication`)
3. In **VM options**, add:
   ```
   -Dspring.profiles.active=local
   ```
4. Click **Apply** and **OK**

**Step 2: Start Local Database**
```bash
# Make sure PostgreSQL is running on localhost:5432
# Create database if not exists:
createdb broandbro_dev

# Verify connection:
psql -h localhost -U broandbro -d broandbro_dev
```

**Step 3: Run Application**
- Click **Run** (or press Shift+F10)
- Application starts with local profile

### Option 2: Command Line

```bash
# Terminal 1: Start PostgreSQL
psql -h localhost -U broandbro -d broandbro_dev

# Terminal 2: Run application with local profile
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

### Option 3: Run JAR

```bash
# Build JAR
./gradlew :backend:bootJar -x test

# Run with local profile
java -Dspring.profiles.active=local -jar backend/build/libs/qrapp-*.jar
```

---

## 📝 What Each Profile Does

### `application.yml` (Default)
- Base configuration for all environments
- AWS Parameter Store is **optional** (won't fail if unavailable)
- Defaults: localhost database, no AWS

### `application-local.yml` (Local Development)
- Disables AWS Parameter Store completely
- Uses localhost PostgreSQL
- No AWS credentials needed
- Debug logging enabled

### `application-dev.yml` (Development/EC2)
- **Enables** AWS Parameter Store auto-create
- Connects to dev RDS instance
- Requires AWS region configured

### `application-ssm-dev.yml` (Dev Parameters)
- All SSM parameter values for dev environment
- Automatically synced to AWS when `auto-create=true`

---

## ✅ Local Development Configuration

**File:** `backend/src/main/resources/application-local.yml`

```yaml
app:
  parameter-store:
    auto-create: false  # Disabled - no AWS needed

# Uses local defaults:
# Database: localhost:5432/broandbro_dev
# User: broandbro
# Password: BroApp#2025
# No AWS, Razorpay, OpenAI, or Twilio credentials needed
```

---

## 🔧 Local Database Setup

### Prerequisites
- PostgreSQL installed locally
- Port 5432 available

### Create Local Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE broandbro_dev;

# Create user
CREATE USER broandbro WITH PASSWORD 'BroApp#2025';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE broandbro_dev TO broandbro;

# Exit
\q
```

### Verify Connection

```bash
psql -h localhost -U broandbro -d broandbro_dev -c "SELECT 1"
# Should return: 1
```

---

## 🎯 Profile Priority

When application starts:

```
spring.profiles.active=local (or dev, or prod)
            ↓
Load application.yml (base)
            ↓
Load application-local.yml (if local profile)
Load application-dev.yml (if dev profile)
Load application-prod.yml (if prod profile)
            ↓
Load application-ssm-local.yml (if local profile)
Load application-ssm-dev.yml (if dev profile)
            ↓
Merge all configurations
            ↓
Application Ready!
```

**Result:** Dev-specific settings override defaults

---

## 📊 Profiles Summary

| Profile | Use Case | AWS Needed | Auto-Create | Database |
|---------|----------|-----------|-------------|----------|
| `local` | Local machine | ❌ No | No | localhost:5432 |
| `dev` | EC2 instance | ✅ Yes | Yes | AWS RDS |
| `prod` | Production | ✅ Yes | Yes | AWS RDS |

---

## ✅ Verify Local Setup

```bash
# 1. Start with local profile
java -Dspring.profiles.active=local -jar backend/build/libs/qrapp-*.jar

# 2. Check logs (should NOT mention AWS errors)
# Look for: "Application started"

# 3. Test API
curl http://localhost:8080/swagger-ui.html

# 4. Should load Swagger UI successfully ✅
```

---

## 🆘 Troubleshooting

### Still getting AWS region error?

**Cause:** Spring profiles not set correctly

**Fix:**
```bash
# IDE: Check Run Configuration → VM options has:
-Dspring.profiles.active=local

# Or set environment variable:
export SPRING_PROFILES_ACTIVE=local

# Then run:
java -jar backend/build/libs/qrapp-*.jar
```

### Database connection refused?

**Cause:** PostgreSQL not running or wrong credentials

**Fix:**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running:
# macOS: brew services start postgresql
# Windows: Start PostgreSQL service
# Linux: sudo systemctl start postgresql

# Verify credentials
psql -h localhost -U broandbro -d broandbro_dev
```

### Parameter Store errors?

**Should not happen with local profile!**

**Cause:** Local profile not active

**Fix:**
1. Verify `application-local.yml` exists
2. Check VM options for `-Dspring.profiles.active=local`
3. Restart application

---

## 🎯 Files Modified

| File | Change |
|------|--------|
| `application-local.yml` | ✅ Created (new) |
| `application.yml` | ✅ Updated (added optional AWS import) |
| `application-dev.yml` | ✅ Updated (added app.parameter-store config) |

---

## 📚 Quick Reference

**Local development:**
```bash
java -Dspring.profiles.active=local -jar app.jar
```

**Dev deployment (EC2):**
```bash
java -Dspring.profiles.active=dev -jar app.jar
# Parameters automatically synced to AWS on startup
```

**Production deployment:**
```bash
java -Dspring.profiles.active=prod -jar app.jar
# All parameters from AWS Parameter Store
```

---

**Status:** ✅ Local Setup Complete  
**Ready to develop:** ✅ Yes

**Next:** Set profile to `local` and run application! 🚀

