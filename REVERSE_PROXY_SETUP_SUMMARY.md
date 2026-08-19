# 🎯 Production Reverse Proxy Setup - COMPLETE

## ✅ What's Been Set Up

You now have everything needed to deploy a production-ready reverse proxy. Here's what was configured:

### 1. **Automated Setup Script**
- **File:** `infra/ec2-reverse-proxy-setup.sh`
- **What it does:**
  - Installs Nginx and Certbot
  - Creates optimized Nginx configuration
  - Enables HTTPS with Let's Encrypt
  - Sets up automatic certificate renewal
  - Configures security headers

### 2. **Backend Configuration Updated**
- **File:** `backend/src/main/resources/application-dev.yml`
- **Changes:**
  ```yaml
  app:
    cors:
      allowed-origins: "${APP_CORS_ALLOWED_ORIGINS:https://develop.broandbro.in,http://localhost:5173}"
  ```
- **What it means:** Backend will accept requests from both frontend domains

### 3. **Frontend Configuration Updated**
- **File:** `frontend/.env.dev`
- **Setting:** `VITE_API_URL=https://dev-api.broandbro.in`
- **What it means:** Frontend will call the new domain (via reverse proxy)

### 4. **CI/CD Integration Script**
- **File:** `infra/github-actions-setup-reverse-proxy.sh`
- **What it does:** Automates Nginx setup in your GitHub Actions workflow

### 5. **Comprehensive Documentation**
- `REVERSE_PROXY_PRODUCTION_SETUP.md` - Detailed guide with all options
- `REVERSE_PROXY_DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

---

## 🚀 How to Deploy (Quick Start)

### **Step 1: SSH to EC2**
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

### **Step 2: Run the Setup Script**
```bash
curl -fsSL https://raw.githubusercontent.com/operationReact/qrapp/dev/infra/ec2-reverse-proxy-setup.sh | \
  sudo bash -s -- dev-api.broandbro.in 8080 admin@broandbro.in
```

**Wait for:** `✅ Setup Complete!` message

### **Step 3: Verify It Works**
```bash
# Test from any machine (or from EC2)
curl -I https://dev-api.broandbro.in/menu
# Expected: HTTP 200 or 401
```

### **Step 4: Rebuild & Deploy Frontend**
```bash
cd frontend
npm run build:dev  # Builds with VITE_API_URL=https://dev-api.broandbro.in
# Upload frontend/dist/ to your web server
```

### **Step 5: Test in Browser**
1. Open `https://develop.broandbro.in`
2. Open DevTools (F12) → Console
3. Check for NO red errors
4. Menu items should load ✅

---

## 📊 Architecture After Deployment

```
User Browser (HTTPS)
      ↓
develop.broandbro.in (Frontend)
      ↓ HTTPS
dev-api.broandbro.in:443 (Nginx Reverse Proxy)
      ↓ HTTP (internal)
localhost:8080 (Spring Boot Backend)
      ↓
PostgreSQL Database
```

---

## 🔒 Security Features Included

✅ TLS 1.2+ only (no weak SSL)  
✅ HTTP/2 for performance  
✅ Automatic HTTP → HTTPS redirect  
✅ Security headers (HSTS, X-Content-Type-Options, etc.)  
✅ SSL certificate auto-renewal (no manual work)  
✅ Connection pooling & optimized timeouts  
✅ Request logging for audit trail  

---

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `infra/ec2-reverse-proxy-setup.sh` | Main setup script (run this!) |
| `backend/src/main/resources/application-dev.yml` | Backend CORS config |
| `frontend/.env.dev` | Frontend API URL for dev build |
| `REVERSE_PROXY_PRODUCTION_SETUP.md` | Complete setup guide |
| `REVERSE_PROXY_DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |

---

## ⚡ Quick Commands

```bash
# From EC2 - Test Nginx setup
curl -I https://dev-api.broandbro.in/menu

# From EC2 - Check SSL certificate
sudo certbot certificates

# From EC2 - View Nginx logs
sudo tail -f /var/log/nginx/backend_access.log

# From EC2 - Test backend directly
curl http://localhost:8080/menu

# From EC2 - Restart Nginx
sudo systemctl restart nginx

# From EC2 - Check Nginx config
sudo nginx -t

# From your machine - Check DNS
nslookup dev-api.broandbro.in
```

---

## 🎯 Before You Deploy

- [ ] EC2 instance is running: `i-0f2ba63193349f4af`
- [ ] Backend running on EC2 (port 8080)
- [ ] Domain DNS points to EC2: `dev-api.broandbro.in` → EC2 IP
- [ ] EC2 security group allows ports 80, 443
- [ ] You have SSH key for EC2
- [ ] You have AWS credentials configured

---

## ⏱️ Estimated Time

| Step | Time |
|------|------|
| 1. Run setup script | 10 min |
| 2. Verify setup works | 5 min |
| 3. Rebuild frontend | 1 min |
| 4. Deploy frontend | 2 min |
| 5. Test in browser | 5 min |
| **Total** | **~23 minutes** |

---

## 📋 What Each Deployment Step Does

### Setup Script (`ec2-reverse-proxy-setup.sh`)

```
1. Install Dependencies (Nginx, Certbot)
2. Backup Existing Config (safety first)
3. Create Nginx Configuration
   ├─ Upstream server pointing to localhost:8080
   ├─ HTTP server (redirect HTTP→HTTPS)
   └─ HTTPS server (SSL termination)
4. Enable Site & Test Nginx Config
5. Setup SSL with Let's Encrypt
   ├─ Certbot requests certificate
   ├─ Nginx validates domain
   └─ Certificate installed
6. Enable Auto-Renewal (runs automatically)
```

### What Nginx Does

For each request to `https://dev-api.broandbro.in`:

```
1. Client connects with HTTPS
2. Nginx terminates SSL/TLS
3. Adds security headers
4. Logs the request
5. Forwards to localhost:8080
6. Receives response from backend
7. Sends response back to client
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] `curl -I https://dev-api.broandbro.in/menu` returns 200/401
- [ ] `sudo certbot certificates` shows valid cert for dev-api.broandbro.in
- [ ] `sudo nginx -t` shows "successful"
- [ ] Frontend loads at `https://develop.broandbro.in`
- [ ] No red errors in browser DevTools Console
- [ ] Menu items display on page
- [ ] API calls succeed (use DevTools Network tab)

---

## 🆘 Troubleshooting

### Setup Script Fails
```bash
# Check prerequisites
curl http://localhost:8080/menu  # Backend must respond
nslookup dev-api.broandbro.in    # Domain must resolve

# Run with debug output
bash infra/ec2-reverse-proxy-setup.sh dev-api.broandbro.in 8080 2>&1 | tee setup.log

# Check specific errors in log
grep ERROR setup.log
grep FAILED setup.log
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Manually renew
sudo certbot renew --force-renewal

# Dry-run renewal
sudo certbot renew --dry-run
```

### Nginx Not Proxying
```bash
# Check config
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check error log
sudo tail -20 /var/log/nginx/backend_error.log
```

### CORS Error in Browser
```bash
# Check CORS headers
curl -I -X OPTIONS https://dev-api.broandbro.in/menu \
  -H "Origin: https://develop.broandbro.in"

# Should show:
# Access-Control-Allow-Origin: https://develop.broandbro.in
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `REVERSE_PROXY_PRODUCTION_SETUP.md` | Full technical guide with all setup options |
| `REVERSE_PROXY_DEPLOYMENT_CHECKLIST.md` | Step-by-step deployment checklist |
| `QUICK_FIX_API_ERRORS.md` | Quick fixes for API connectivity issues |
| `LOCAL_DEVELOPMENT_SETUP.md` | Setup for local development |
| `API_CONNECTION_TROUBLESHOOTING.md` | Detailed API troubleshooting guide |
| `BACKEND_CONNECTIVITY_FIX.md` | Backend connectivity solutions |

---

## 🎓 Learning Resources

### Understanding the Setup

```
Nginx Reverse Proxy
├─ Acts as intermediary between client and backend
├─ Handles SSL/TLS encryption
├─ Routes requests to backend
├─ Logs all traffic
└─ Can scale to multiple backends

Let's Encrypt
├─ Free SSL/TLS certificates
├─ Auto-renewal every 90 days
├─ Industry-standard (trusted by all browsers)
└─ Automated via Certbot

CORS (Cross-Origin Resource Sharing)
├─ Security feature in browsers
├─ Prevents unauthorized API access
├─ Configured on backend
└─ Must allow frontend domain
```

### How It Works Step-by-Step

1. **User navigates to `https://develop.broandbro.in`**
   - Frontend loads in browser

2. **Frontend JavaScript makes API call to `https://dev-api.broandbro.in/menu`**
   - Browser sends HTTPS request with CORS headers

3. **DNS resolves `dev-api.broandbro.in` → EC2 IP**
   - Network routes request to EC2

4. **Nginx listens on port 443 (HTTPS)**
   - Receives request
   - Validates SSL certificate (Let's Encrypt)
   - Checks CORS headers

5. **Nginx forwards to backend on localhost:8080**
   - Backend processes request
   - Returns JSON response

6. **Nginx sends response back to browser**
   - Adds security headers
   - Browser receives data
   - Frontend renders UI

---

## 🚀 Ready to Deploy?

**Run this one command to get started:**

```bash
# SSH to your EC2 instance first
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Then run:
curl -fsSL https://raw.githubusercontent.com/operationReact/qrapp/dev/infra/ec2-reverse-proxy-setup.sh | \
  sudo bash -s -- dev-api.broandbro.in 8080 admin@broandbro.in
```

Expected output when successful:
```
════════════════════════════════════════════════════════════════
✅ Setup Complete!
════════════════════════════════════════════════════════════════
```

**Then proceed with:**
1. Verify setup: `curl -I https://dev-api.broandbro.in/menu`
2. Rebuild frontend: `cd frontend && npm run build:dev`
3. Deploy frontend to your web server
4. Test in browser: Open `https://develop.broandbro.in`

---

## 📞 Need Help?

If you encounter issues:

1. **Check logs:**
   ```bash
   sudo tail -f /var/log/nginx/backend_error.log
   ```

2. **Run diagnostic:**
   ```bash
   sudo nginx -t
   curl http://localhost:8080/menu
   nslookup dev-api.broandbro.in
   ```

3. **Review checklist:** `REVERSE_PROXY_DEPLOYMENT_CHECKLIST.md`

4. **Read full guide:** `REVERSE_PROXY_PRODUCTION_SETUP.md`

---

## ✨ Summary

You now have:
- ✅ Automated Nginx reverse proxy setup script
- ✅ SSL/TLS configuration with Let's Encrypt
- ✅ Backend CORS configuration updated
- ✅ Frontend API URL configured
- ✅ Comprehensive documentation
- ✅ Deployment checklist
- ✅ Troubleshooting guide

**Status:** Ready to Deploy! 🚀

**Next Action:** Run setup script on EC2 instance (23 minute total deployment time)

---

**Date:** August 15, 2026  
**Deployment Type:** Production-Ready  
**Status:** ✅ Complete & Ready to Deploy

