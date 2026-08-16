# ✅ Use Dev Profile Everywhere

**Simple:** One profile (dev) for both local and EC2

```bash
java -Dspring.profiles.active=dev -jar app.jar
```

**Works locally:** AWS Parameter Store is optional, won't fail

**Works on EC2:** AWS credentials available, parameters auto-synced

---

## 🚀 That's It!

No separate local profile needed.

Local & EC2 both use dev profile.

Simple. Clean. Done. ✅

