# Production-Ready Reverse Proxy Setup Guide

## Overview

This guide sets up Nginx as a reverse proxy in front of your backend service, enabling:
- ✅ HTTPS/SSL encryption with Let's Encrypt
- ✅ Domain-based access (`https://dev-api.broandbro.in`)
- ✅ Automatic HTTP → HTTPS redirect
- ✅ Security headers and best practices
- ✅ SSL certificate auto-renewal
- ✅ Connection pooling and optimized timeouts

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Frontend (develop.broandbro.in)                    │
│ npm run build:dev                                   │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────┐
│ Nginx Reverse Proxy (Port 443)                      │
│ • SSL/TLS termination                               │
│ • Request routing                                   │
│ • Security headers                                  │
│ • Logging                                           │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (internal)
                         ↓
┌─────────────────────────────────────────────────────┐
│ Spring Boot Backend (localhost:8080)                │
│ • API endpoints                                     │
│ • Database queries                                  │
│ • Business logic                                    │
└─────────────────────────────────────────────────────┘
```

---

## Quick Setup (Automated)

### Option 1: Run Setup Script Directly on EC2

```bash
# SSH to your EC2 instance
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/operationReact/qrapp/dev/infra/ec2-reverse-proxy-setup.sh | \
  sudo bash -s -- dev-api.broandbro.in 8080 admin@broandbro.in
```

Expected output:
```
════════════════════════════════════════════════════════════════
✅ Setup Complete!
════════════════════════════════════════════════════════════════

📋 Configuration Summary:
   • Domain:           https://dev-api.broandbro.in
   • Backend:          http://127.0.0.1:8080
   • Nginx Config:     /etc/nginx/sites-available/backend-proxy
   • SSL Cert:         /etc/letsencrypt/live/dev-api.broandbro.in/
   • Access Log:       /var/log/nginx/backend_access.log
   • Error Log:        /var/log/nginx/backend_error.log

🧪 Test the setup:
   curl -I https://dev-api.broandbro.in/menu
```

### Option 2: Integration into GitHub Actions (CI/CD)

Add this step to your `.github/workflows/deploy-dev.yml`:

```yaml
- name: Setup Nginx Reverse Proxy
  run: |
    bash infra/github-actions-setup-reverse-proxy.sh \
      i-0f2ba63193349f4af \
      dev-api.broandbro.in \
      8080 \
      us-east-1
  env:
    AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
    AWS_DEFAULT_REGION: us-east-1
```

---

## Manual Setup (Step-by-Step)

If you prefer to set up manually:

### 1. SSH to EC2
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

### 2. Install Nginx and Certbot
```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 3. Create Nginx Configuration
```bash
sudo tee /etc/nginx/sites-available/backend-proxy > /dev/null << 'EOF'
upstream backend {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name dev-api.broandbro.in;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name dev-api.broandbro.in;

    ssl_certificate /etc/letsencrypt/live/dev-api.broandbro.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-api.broandbro.in/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    access_log /var/log/nginx/backend_access.log combined;
    error_log /var/log/nginx/backend_error.log warn;

    location / {
        proxy_pass http://backend;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
```

### 4. Enable and Test
```bash
sudo ln -sf /etc/nginx/sites-available/backend-proxy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL with Let's Encrypt
```bash
sudo mkdir -p /var/www/certbot

sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d dev-api.broandbro.in \
  --email admin@broandbro.in \
  --agree-tos \
  --non-interactive

# Restart Nginx to apply SSL
sudo systemctl restart nginx
```

### 6. Enable Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Verification

### Test the Setup

```bash
# Test HTTPS connection
curl -I https://dev-api.broandbro.in/menu

# Should return HTTP 200 or 401 (not connection refused)
# Response headers should include SSL info

# Test with curl showing headers
curl -I -v https://dev-api.broandbro.in/menu

# Test actual API call
curl https://dev-api.broandbro.in/menu | jq .
```

### Check SSL Certificate
```bash
# View certificate details
sudo certbot certificates

# Check expiration
sudo certbot certificates --authenticator webroot
```

### View Logs
```bash
# Nginx access log
sudo tail -f /var/log/nginx/backend_access.log

# Nginx error log
sudo tail -f /var/log/nginx/backend_error.log

# Backend application log (if available)
journalctl -u your-service-name -n 100 --no-pager
```

---

## Backend Configuration

### Update CORS Settings

The backend CORS is configured in `backend/src/main/resources/application-dev.yml`:

```yaml
app:
  cors:
    allowed-origins: "${APP_CORS_ALLOWED_ORIGINS:https://develop.broandbro.in,http://localhost:5173}"
```

**To allow additional frontend domains**, set the environment variable:

```bash
export APP_CORS_ALLOWED_ORIGINS="https://develop.broandbro.in,https://staging.broandbro.in"
```

Or add to your Docker/systemd configuration:

```bash
APP_CORS_ALLOWED_ORIGINS=https://develop.broandbro.in,https://staging.broandbro.in
```

### Server Port

The backend runs on port **8080** (internal, not exposed):
- Accessible only from localhost
- Nginx proxies all external requests

If you need to change the port, update:
- `backend/src/main/resources/application.yml` → `server.port`
- Nginx config: `proxy_pass http://127.0.0.1:YOUR_NEW_PORT`

---

## Frontend Configuration

### Build for Dev Environment

```bash
cd frontend

# Uses .env.dev with VITE_API_URL=https://dev-api.broandbro.in
npm run build:dev

# Output: frontend/dist/
```

### Environment Variables

**`.env.dev`** (what to use):
```
VITE_API_URL=https://dev-api.broandbro.in
```

**`.env.development`** (local dev only):
```
VITE_API_URL=http://localhost:8080
```

---

## Troubleshooting

### Issue: SSL Certificate Errors

```bash
# Check certificate status
sudo certbot certificates

# If expired or not found, renew manually
sudo certbot renew --force-renewal

# Restart Nginx to apply
sudo systemctl restart nginx
```

### Issue: 502 Bad Gateway

```bash
# Check if backend is running
curl http://localhost:8080/menu

# Check Nginx config
sudo nginx -t

# View error logs
sudo tail -20 /var/log/nginx/backend_error.log

# Restart services
sudo systemctl restart nginx
# SSH to backend and check service status
```

### Issue: CORS Errors in Browser

```bash
# Check CORS headers are present
curl -I -X OPTIONS https://dev-api.broandbro.in/menu \
  -H "Origin: https://develop.broandbro.in"

# Should show:
# Access-Control-Allow-Origin: https://develop.broandbro.in
# Access-Control-Allow-Methods: GET, POST, ...

# If not present, check backend CORS config
# and APP_CORS_ALLOWED_ORIGINS environment variable
```

### Issue: High Latency or Timeouts

```bash
# Check Nginx connection settings
sudo cat /etc/nginx/sites-available/backend-proxy | grep timeout

# Default: 300s (5 minutes)
# Increase if needed for long-running operations
```

---

## Maintenance

### Daily Tasks
- Monitor logs: `sudo tail -f /var/log/nginx/backend_access.log`
- Check disk space: `df -h`

### Weekly Tasks
- Review SSL certificate expiry: `sudo certbot certificates`
- Check backend health: `curl -s https://dev-api.broandbro.in/health | jq .`

### Monthly Tasks
- Renew SSL certificate: `sudo certbot renew`
- Review Nginx config: `sudo nginx -t`
- Archive old logs: `sudo logrotate -f /etc/logrotate.d/nginx`

---

## Security Considerations

✅ **Implemented:**
- TLS 1.2+ only (no SSL 3.0 or TLS 1.0/1.1)
- HTTP/2 support for performance
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options)
- Automatic HTTPS redirect
- Certificate auto-renewal
- Connection pooling and keepalive
- Request timeouts to prevent hangs

⚠️ **Additional Recommendations:**
- Setup firewall rules to allow only ports 80/443 from specific IPs
- Monitor certificate renewal: `sudo certbot renew --dry-run`
- Keep Nginx updated: `sudo apt-get update && sudo apt-get upgrade -y nginx`
- Setup DDoS protection (Cloudflare, AWS WAF)
- Use VPN/private networking for backend access

---

## Command Reference

```bash
# ──────────────────────────────────────────────────────────
# Nginx Management
# ──────────────────────────────────────────────────────────

# Check configuration
sudo nginx -t

# Restart service
sudo systemctl restart nginx

# Reload config (without dropping connections)
sudo systemctl reload nginx

# View status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/backend_access.log
sudo tail -f /var/log/nginx/backend_error.log

# ──────────────────────────────────────────────────────────
# SSL Certificate Management
# ──────────────────────────────────────────────────────────

# View all certificates
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal (dry-run)
sudo certbot renew --dry-run

# Manual renewal for specific domain
sudo certbot certonly --webroot -w /var/www/certbot -d dev-api.broandbro.in

# ──────────────────────────────────────────────────────────
# Testing & Debugging
# ──────────────────────────────────────────────────────────

# Test HTTPS
curl -I https://dev-api.broandbro.in/menu

# Test with verbose output
curl -I -v https://dev-api.broandbro.in/menu

# Test CORS headers
curl -I -X OPTIONS https://dev-api.broandbro.in/menu \
  -H "Origin: https://develop.broandbro.in"

# Test backend directly
curl -I http://localhost:8080/menu

# DNS resolution check
nslookup dev-api.broandbro.in

# ──────────────────────────────────────────────────────────
# System Information
# ──────────────────────────────────────────────────────────

# Check disk space
df -h

# Check memory
free -h

# View running processes
ps aux | grep nginx
ps aux | grep java

# Check listening ports
sudo netstat -tlnp | grep -E ':(80|443|8080)'

# ──────────────────────────────────────────────────────────
```

---

## Support

For issues with:
- **Nginx**: Check `/var/log/nginx/backend_error.log`
- **SSL**: Run `sudo certbot certificates` and `sudo certbot renew --dry-run`
- **Backend connectivity**: Test `curl http://localhost:8080/menu` from EC2
- **CORS**: Verify `APP_CORS_ALLOWED_ORIGINS` environment variable

Still need help? Create an issue on GitHub with:
1. Nginx error logs
2. Output of `sudo nginx -t`
3. Output of `sudo certbot certificates`
4. Browser console errors (if applicable)

