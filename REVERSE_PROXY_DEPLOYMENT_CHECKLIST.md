# 🚀 Production Reverse Proxy - Deployment Checklist

## Pre-Deployment (Before Running Setup)

- [ ] Backend is deployed and running on EC2 instance: `i-0f2ba63193349f4af`
- [ ] Backend is accessible on localhost:8080 from EC2
  ```bash
  ssh to EC2 && curl http://localhost:8080/menu
  ```
- [ ] Domain DNS points to EC2 public IP: `dev-api.broandbro.in`
  ```bash
  nslookup dev-api.broandbro.in
  # Should return EC2 public IP
  ```
- [ ] EC2 security group allows ports 80 and 443
- [ ] Email address for SSL cert: `admin@broandbro.in` ✅

---

## Phase 1: Setup Nginx Reverse Proxy (10 minutes)

### Option A: Automated (RECOMMENDED)

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Run setup script
curl -fsSL https://raw.githubusercontent.com/operationReact/qrapp/dev/infra/ec2-reverse-proxy-setup.sh | \
  sudo bash -s -- dev-api.broandbro.in 8080 admin@broandbro.in
```

**Wait for:** ✅ Setup Complete message

- [ ] Dependencies installed (nginx, certbot)
- [ ] Nginx configuration created
- [ ] Nginx service restarted
- [ ] SSL certificate generated
- [ ] Auto-renewal enabled

### Option B: CI/CD Integration

Add to `.github/workflows/build-deploy-dev.yml`:

```yaml
- name: Setup Nginx Reverse Proxy
  run: |
    bash infra/github-actions-setup-reverse-proxy.sh \
      i-0f2ba63193349f4af \
      dev-api.broandbro.in \
      8080 \
      us-east-1
```

---

## Phase 2: Verify Nginx is Working (5 minutes)

### Test from any machine:

```bash
# Test HTTPS connection
curl -I https://dev-api.broandbro.in/menu
# Expected: HTTP 200 or 401 (connection successful)

# Test actual API response
curl https://dev-api.broandbro.in/menu | jq .
# Expected: JSON menu data or error (not connection refused)

# Check SSL certificate
curl -I -v https://dev-api.broandbro.in/menu 2>&1 | grep -E "(SSL|certificate|issuer)"
# Expected: Let's Encrypt certificate
```

- [ ] HTTPS connection successful (not ERR_CONNECTION_REFUSED)
- [ ] SSL certificate valid (Let's Encrypt)
- [ ] Backend API responding through proxy

---

## Phase 3: Update Backend Config (2 minutes)

### File: `backend/src/main/resources/application-dev.yml`

Verify CORS is configured for dev frontend:

```yaml
app:
  cors:
    allowed-origins: "${APP_CORS_ALLOWED_ORIGINS:https://develop.broandbro.in,http://localhost:5173}"
```

- [ ] Backend CORS includes `https://develop.broandbro.in`
- [ ] Backend CORS includes `http://localhost:5173` (for local dev)

### Deploy Backend Update

```bash
cd backend
./gradlew bootJar
# Deploy the updated JAR to EC2
```

Or if already deployed, just set environment variable:

```bash
export APP_CORS_ALLOWED_ORIGINS="https://develop.broandbro.in,http://localhost:5173"
# Restart backend service
systemctl restart your-backend-service
```

- [ ] Backend restarted with updated CORS config

---

## Phase 4: Update Frontend Config (1 minute)

### File: `frontend/.env.dev`

Should already be updated to:

```
VITE_API_URL=https://dev-api.broandbro.in
```

- [ ] Frontend `.env.dev` uses `https://dev-api.broandbro.in`
- [ ] Frontend `.env.development` still uses `http://localhost:8080` (local dev)

### Build for Dev Environment

```bash
cd frontend
npm run build:dev
# Creates: frontend/dist/
```

- [ ] Frontend built successfully
- [ ] `dist/index.html` references correct API URL

### Deploy Frontend

Upload `frontend/dist/` to your web server (e.g., S3 + CloudFront)

- [ ] Frontend deployed to `https://develop.broandbro.in`

---

## Phase 5: Test End-to-End (5 minutes)

### 1. Test Frontend Loading

```bash
# Open in browser
https://develop.broandbro.in

# Open DevTools → Console (F12)
# Should see NO red errors about API connection
```

- [ ] Frontend loads at `https://develop.broandbro.in`
- [ ] No CORS errors in console
- [ ] No `ERR_CONNECTION_REFUSED` errors

### 2. Test API Calls

In browser DevTools Console:

```javascript
// Test menu endpoint
fetch('https://dev-api.broandbro.in/menu')
  .then(r => r.json())
  .then(d => console.log('✅ Menu loaded:', d.length, 'items'))
  .catch(e => console.error('❌ Error:', e))

// Test categories endpoint
fetch('https://dev-api.broandbro.in/categories')
  .then(r => r.json())
  .then(d => console.log('✅ Categories loaded:', d))
  .catch(e => console.error('❌ Error:', e))
```

Expected output:
```
✅ Menu loaded: 15 items
✅ Categories loaded: Array(4)
```

- [ ] Menu API returns data
- [ ] Categories API returns data
- [ ] No CORS errors
- [ ] No connection refused errors

### 3. Test UI Functionality

- [ ] Menu items display on page
- [ ] Categories show in dropdown
- [ ] Can navigate through menu
- [ ] Can add items to cart
- [ ] Can place order (if implemented)

- [ ] All UI features working

---

## Phase 6: SSL Certificate Management (Ongoing)

### Certificate Status

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Check certificate expiration
sudo certbot certificates
# Should show certificate for dev-api.broandbro.in
# Expires in ~90 days

# Dry-run renewal
sudo certbot renew --dry-run
# Should succeed without errors
```

- [ ] Certificate installed for `dev-api.broandbro.in`
- [ ] Auto-renewal enabled
- [ ] Dry-run renewal successful

### Renewal Schedule

- Auto-renewal runs automatically via `certbot.timer`
- Renewal checks happen twice daily
- Renewal triggers when certificate < 30 days from expiry
- No manual action needed (unless failure)

---

## Phase 7: Monitoring & Logs (Ongoing)

### Check Logs from EC2

```bash
# Nginx access log
sudo tail -f /var/log/nginx/backend_access.log
# Shows all requests to the proxy

# Nginx error log
sudo tail -f /var/log/nginx/backend_error.log
# Shows connection or routing issues

# Backend application log
journalctl -u your-backend-service -n 50 --no-pager
# Shows backend errors
```

- [ ] Setup log monitoring
- [ ] Understand what each log shows

### Common Log Patterns

```
# Good request (200 OK)
[10.0.0.1] "GET /menu HTTP/2.0" 200 1234 "https://develop.broandbro.in"

# Proxy error (backend down)
[10.0.0.1] "GET /menu HTTP/2.0" 502 169 upstream timed out

# CORS pre-flight (OPTIONS)
[10.0.0.1] "OPTIONS /menu HTTP/2.0" 200 0
```

---

## Rollback Plan (If Something Goes Wrong)

If you need to revert to direct IP access:

1. **Update frontend `.env.dev`:**
   ```
   VITE_API_URL=http://YOUR_EC2_IP:8080
   ```

2. **Rebuild frontend:**
   ```bash
   npm run build:dev
   ```

3. **Redeploy frontend**

4. **Disable Nginx (if needed):**
   ```bash
   sudo systemctl stop nginx
   sudo systemctl disable nginx
   ```

---

## Success Criteria ✅

All items must be completed:

- [ ] Nginx reverse proxy running on EC2
- [ ] SSL certificate valid (Let's Encrypt)
- [ ] Frontend loads at `https://develop.broandbro.in`
- [ ] Backend API accessible at `https://dev-api.broandbro.in`
- [ ] No CORS errors in browser
- [ ] No `ERR_CONNECTION_REFUSED` errors
- [ ] Menu and categories load correctly
- [ ] API endpoints return data
- [ ] SSL auto-renewal configured
- [ ] Logs available for monitoring

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Setup Nginx + SSL | 10 min | ⏳ |
| 2 | Verify Nginx | 5 min | ⏳ |
| 3 | Update Backend CORS | 2 min | ⏳ |
| 4 | Rebuild Frontend | 1 min | ⏳ |
| 5 | Test End-to-End | 5 min | ⏳ |
| 6 | SSL Certificate Mgmt | - | ⏳ |
| 7 | Setup Monitoring | - | ⏳ |
| **TOTAL** | **All Phases** | **~23 min** | ⏳ |

---

## Support & Troubleshooting

### Issue: SSL Certificate Error

```bash
# Manually renew
sudo certbot renew --force-renewal

# Check status
sudo certbot certificates

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: 502 Bad Gateway

```bash
# Backend might be down
curl http://localhost:8080/menu

# Check backend service
systemctl status your-backend-service

# Check Nginx error log
sudo tail -20 /var/log/nginx/backend_error.log
```

### Issue: CORS Error in Browser

```bash
# Verify CORS headers
curl -I -X OPTIONS https://dev-api.broandbro.in/menu \
  -H "Origin: https://develop.broandbro.in" \
  -H "Access-Control-Request-Method: GET"

# Should show:
# Access-Control-Allow-Origin: https://develop.broandbro.in

# If not, check APP_CORS_ALLOWED_ORIGINS env var
```

### Issue: Connection Refused

```bash
# Test Nginx
curl -I https://dev-api.broandbro.in/menu

# Check Nginx status
sudo systemctl status nginx

# Check if listening on port 443
sudo netstat -tlnp | grep nginx

# Restart Nginx
sudo systemctl restart nginx
```

---

## Next Steps After Deployment

1. **Update documentation**
   - Add `https://dev-api.broandbro.in` to README
   - Update team on new URL

2. **Setup monitoring**
   - Configure CloudWatch/ELK for logs
   - Setup alerts for certificate renewal failures

3. **Consider additional features**
   - Add rate limiting at Nginx level
   - Add WAF (Web Application Firewall)
   - Setup CDN for static assets
   - Add caching headers for API responses

4. **Performance tuning**
   - Monitor response times
   - Adjust Nginx buffer sizes if needed
   - Enable gzip compression

---

**Date Started:** August 15, 2026  
**Current Status:** Ready to Deploy  
**Estimated Completion:** August 15, 2026 (~23 minutes)

