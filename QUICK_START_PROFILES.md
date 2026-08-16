# ⚡ Quick Start - Run Locally vs EC2

## 🏃 Quick Start

### Option 1: Run Locally (NO AWS needed)

```bash
# Set profile and run
java -Dspring.profiles.active=local -jar backend/build/libs/qrapp-0.0.1-SNAPSHOT.jar
```

**What you need:**
- ✅ PostgreSQL running on localhost:5432
- ✅ Database: `broandbro_dev`
- ✅ User: `broandbro` / Password: `BroApp#2025`

**What you DON'T need:**
- ❌ AWS credentials
- ❌ AWS region configuration
- ❌ EC2 instance

### Option 2: Run on EC2 (WITH AWS Parameter Store)

```bash
# On EC2, automatic deployment via GitHub Actions
# Sets profile to dev automatically
# Parameters auto-synced to AWS

# Or manually:
java -Dspring.profiles.active=dev -jar backend/build/libs/qrapp-0.0.1-SNAPSHOT.jar
```

**What you need:**
- ✅ EC2 instance
- ✅ AWS IAM role with SSM permissions
- ✅ AWS Parameter Store configured
- ✅ RDS database instance

---

## 📁 Configuration Files

| File | Profile | Purpose |
|------|---------|---------|
| `application.yml` | All | Base config |
| `application-local.yml` | local | No AWS, localhost DB |
| `application-dev.yml` | dev | AWS enabled, EC2 RDS |
| `application-ssm-dev.yml` | dev | Dev SSM parameters |

---

## 🎯 Set Profile in IDE

**IntelliJ IDEA:**
1. Run → Edit Configurations
2. VM options: `-Dspring.profiles.active=local`
3. Run!

**Eclipse:**
1. Run → Run Configurations
2. Arguments → VM arguments: `-Dspring.profiles.active=local`
3. Run!

**VS Code:**
```json
{
  "args": "-Dspring.profiles.active=local"
}
```

---

## ✅ Compilation Status

```
BUILD SUCCESSFUL ✅
No compilation errors
Ready to deploy
```

---

## 📚 Full Documentation

- **`LOCAL_DEVELOPMENT_SETUP.md`** - Complete local setup guide
- **`LOCAL_DEVELOPMENT_FIX_SUMMARY.md`** - Problem and solution
- **`DEDICATED_SSM_FILES_COMPLETE.md`** - SSM structure
- **`SSM_UPDATE_COMPLETE_REPORT.md`** - Dev SSM parameters

---

## 🚀 Deployment Paths

### Local Development
```
Code change
    ↓
Rebuild (or IDE auto-rebuild)
    ↓
Run with: -Dspring.profiles.active=local
    ↓
Test locally
```

### EC2 Development
```
Code change
    ↓
Rebuild JAR
    ↓
git push origin dev
    ↓
GitHub Actions builds & deploys
    ↓
Parameters auto-synced to AWS
    ↓
Application running on EC2 ✅
```

---

## ⚡ TL;DR

**Local:** 
```bash
java -Dspring.profiles.active=local -jar app.jar
```

**EC2:**
```bash
java -Dspring.profiles.active=dev -jar app.jar
# Auto-syncs parameters to AWS
```

**That's it!** 🎉

