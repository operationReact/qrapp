#!/bin/bash
# Complete Nginx Reverse Proxy Setup for Backend
# Run on EC2: sudo bash ec2-reverse-proxy-setup.sh dev-api.broandbro.in 8080

set -euo pipefail

# Configuration
DOMAIN="${1:-dev-api.broandbro.in}"
BACKEND_PORT="${2:-8080}"
BACKEND_HOST="127.0.0.1"
EMAIL="${3:-admin@broandbro.in}"

echo "════════════════════════════════════════════════════════════════"
echo "🚀 Nginx Reverse Proxy Setup"
echo "════════════════════════════════════════════════════════════════"
echo "Domain:         $DOMAIN"
echo "Backend:        $BACKEND_HOST:$BACKEND_PORT"
echo "Email (SSL):    $EMAIL"
echo "════════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────
# Step 1: Install Dependencies
# ─────────────────────────────────────────────────────────────────
echo ""
echo "📦 [1/5] Installing Nginx and Certbot..."

sudo apt-get update -qq
sudo apt-get install -y -qq \
  nginx \
  certbot \
  python3-certbot-nginx \
  curl \
  wget

echo "✅ Dependencies installed"

# ─────────────────────────────────────────────────────────────────
# Step 2: Backup existing Nginx config
# ─────────────────────────────────────────────────────────────────
echo ""
echo "💾 [2/5] Backing up existing Nginx configuration..."

if [ -f /etc/nginx/sites-available/backend-proxy ]; then
  sudo cp /etc/nginx/sites-available/backend-proxy /etc/nginx/sites-available/backend-proxy.bak
  echo "✅ Backup created: backend-proxy.bak"
fi

# ─────────────────────────────────────────────────────────────────
# Step 3: Create Nginx Configuration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "⚙️  [3/5] Creating Nginx reverse proxy configuration..."

sudo tee /etc/nginx/sites-available/backend-proxy > /dev/null << 'EOF'
# Upstream backend server
upstream backend {
    server 127.0.0.1:BACKEND_PORT;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name DOMAIN;

    # SSL certificates (will be created by Certbot)
    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/backend_access.log combined;
    error_log /var/log/nginx/backend_error.log warn;

    # Root location
    location / {
        proxy_pass http://backend;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Connection management
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Health check endpoint (optional)
    location /health {
        access_log off;
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
EOF

# Replace variables
sudo sed -i "s|DOMAIN|$DOMAIN|g" /etc/nginx/sites-available/backend-proxy
sudo sed -i "s|BACKEND_PORT|$BACKEND_PORT|g" /etc/nginx/sites-available/backend-proxy

echo "✅ Nginx configuration created"

# ─────────────────────────────────────────────────────────────────
# Step 4: Enable Site & Test Configuration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "🔗 [4/5] Enabling site and testing configuration..."

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable our site
sudo ln -sf /etc/nginx/sites-available/backend-proxy /etc/nginx/sites-enabled/

# Test configuration
if sudo nginx -t; then
  echo "✅ Nginx configuration is valid"
else
  echo "❌ Nginx configuration test failed!"
  exit 1
fi

# Restart Nginx
sudo systemctl restart nginx
echo "✅ Nginx restarted"

# ─────────────────────────────────────────────────────────────────
# Step 5: Setup SSL with Let's Encrypt
# ─────────────────────────────────────────────────────────────────
echo ""
echo "🔒 [5/5] Setting up SSL with Let's Encrypt..."

# Create certbot webroot directory
sudo mkdir -p /var/www/certbot

# Check if cert already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "✅ SSL certificate already exists for $DOMAIN"
  echo "   To renew: sudo certbot renew"
else
  echo "   Creating new SSL certificate..."

  if sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email 2>/dev/null; then
    echo "✅ SSL certificate created"
  else
    echo "⚠️  SSL certificate creation requires manual intervention:"
    echo "   sudo certbot certonly --nginx -d $DOMAIN"
    echo "   After setup, restart Nginx: sudo systemctl restart nginx"
  fi
fi

# Setup auto-renewal
echo ""
echo "📅 Setting up certificate auto-renewal..."
sudo systemctl enable certbot.timer 2>/dev/null || true
sudo systemctl start certbot.timer 2>/dev/null || true
echo "✅ Auto-renewal configured"

# ─────────────────────────────────────────────────────────────────
# Final Status
# ─────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Configuration Summary:"
echo "   • Domain:           https://$DOMAIN"
echo "   • Backend:          http://$BACKEND_HOST:$BACKEND_PORT"
echo "   • Nginx Config:     /etc/nginx/sites-available/backend-proxy"
echo "   • SSL Cert:         /etc/letsencrypt/live/$DOMAIN/"
echo "   • Access Log:       /var/log/nginx/backend_access.log"
echo "   • Error Log:        /var/log/nginx/backend_error.log"
echo ""
echo "🧪 Test the setup:"
echo "   curl -I https://$DOMAIN/menu"
echo ""
echo "📝 Update frontend .env.dev to:"
echo "   VITE_API_URL=https://$DOMAIN"
echo ""
echo "🔄 Common commands:"
echo "   • Restart Nginx:    sudo systemctl restart nginx"
echo "   • View logs:        sudo tail -f /var/log/nginx/backend_access.log"
echo "   • Renew SSL:        sudo certbot renew"
echo "   • Check renewal:    sudo certbot renew --dry-run"
echo ""

