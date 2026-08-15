# Fix Backend Connectivity - Action Plan

## 🚨 Current Problem
- Backend running on EC2:8080 but **NOT accessible** at `https://dev-api.broandbro.in/`
- Frontend getting `ERR_CONNECTION_REFUSED`
- Domain exists but not proxying to backend

---

## ✅ IMMEDIATE FIX (5 minutes)

### 1. Get EC2 Public IP
```bash
aws ec2 describe-instances \
  --instance-ids i-0f2ba63193349f4af \
  --region us-east-1 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

Copy the returned IP (e.g., `54.123.45.67`)

### 2. Update Frontend Config
Edit `frontend/.env.dev`:
```
VITE_API_URL=http://54.123.45.67:8080
```
(Replace `54.123.45.67` with your actual EC2 IP)

### 3. Rebuild Frontend
```bash
cd frontend
npm run build:dev
# Upload dist/ to your web server
```

### 4. Test
Open browser DevTools Console:
```javascript
fetch('http://54.123.45.67:8080/menu')
  .then(r => r.json())
  .then(d => console.log(d))
```

✅ Should return menu data!

---

## 🔧 PRODUCTION FIX (After Testing Works)

Once you confirm the IP-based approach works, set up reverse proxy:

### Option A: Manual Setup on EC2
```bash
# SSH to your EC2 instance
ssh -i your-key.pem ec2-user@54.123.45.67

# Download and run setup script
curl https://raw.githubusercontent.com/operationReact/qrapp/dev/setup-nginx-reverse-proxy.sh | sudo bash

# Or if you have the file locally
sudo bash setup-nginx-reverse-proxy.sh dev-api.broandbro.in 8080
```

### Option B: Add to GitHub Actions CI/CD
Add this to your deployment workflow to auto-configure Nginx after backend starts.

### After Proxy Setup
Update `frontend/.env.dev` back to:
```
VITE_API_URL=https://dev-api.broandbro.in
```

Then rebuild and deploy frontend.

---

## 📋 Checklist

- [ ] Get EC2 public IP
- [ ] Update `frontend/.env.dev` with IP:8080
- [ ] Rebuild frontend: `npm run build:dev`
- [ ] Deploy frontend build
- [ ] Test API call in browser console
- [ ] Confirm menu items load ✅
- [ ] (Optional) Setup Nginx reverse proxy for production
- [ ] Update frontend config to use domain instead of IP
- [ ] Rebuild and redeploy frontend

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Still getting `ERR_CONNECTION_REFUSED` | EC2 security group doesn't allow port 8080. Check AWS console → EC2 → Security Groups |
| IP address not found | EC2 might not have public IP. Check AWS console or terminate and restart with public IP |
| Backend returns 502 Bad Gateway | Nginx working but backend not running on 8080. SSH to EC2 and check service status |

---

## Quick Commands Reference

```bash
# Get EC2 IP
aws ec2 describe-instances --instance-ids i-0f2ba63193349f4af --region us-east-1 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

# Check if backend is running (from EC2)
curl http://localhost:8080/menu

# Check backend service status (from EC2)
systemctl status <your-service-name>

# View backend logs (from EC2)
journalctl -u <your-service-name> -n 100 --no-pager

# Test Nginx (from EC2)
sudo nginx -t
sudo systemctl restart nginx
```

---

## Backend Running On
- **Server:** EC2 Instance `i-0f2ba63193349f4af`
- **Port:** 8080
- **Database:** AWS RDS PostgreSQL
- **Profile:** dev
- **Status:** ✅ Running (deployment successful)

