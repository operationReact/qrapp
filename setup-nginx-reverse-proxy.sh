#!/bin/bash
# Setup Nginx reverse proxy for backend on EC2
# Run this on the EC2 instance with: sudo bash setup-nginx-reverse-proxy.sh

set -euo pipefail

DOMAIN="${1:-dev-api.broandbro.in}"
BACKEND_PORT="${2:-8080}"

echo "🚀 Setting up Nginx reverse proxy for $DOMAIN → localhost:$BACKEND_PORT"

# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/backend-proxy > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 25m;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Hub-Signature-256 \$http_x_hub_signature_256;
        proxy_pass_request_body on;
        proxy_read_timeout 300s;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/backend-proxy /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

echo "✅ Nginx configured for $DOMAIN on port 80"
echo ""
echo "🔒 Setting up HTTPS with Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@broandbro.in 2>/dev/null || echo "⚠️  Certbot setup requires manual input"

echo "✅ Setup complete!"
echo ""
echo "Update your frontend .env.dev to:"
echo "VITE_API_URL=https://$DOMAIN"
echo ""
echo "Restart backend to apply:"
echo "  systemctl restart <your-service-name>"
