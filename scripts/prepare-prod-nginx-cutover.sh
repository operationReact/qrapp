#!/usr/bin/env bash
# Stage HTTP-only main hostname virtual hosts on the NEW account EC2.
# Does not change public DNS, create certificates, or touch the existing API/preview vhosts.
set -euo pipefail
test -f /var/www/broandbro/index.html || { echo "Frontend build missing on EC2"; exit 1; }
BACKUP=""
TARGET="/etc/nginx/conf.d/broandbro-main-cutover.conf"
if [ -e "$TARGET" ]; then
  BACKUP="$(mktemp /tmp/broandbro-main-cutover.XXXXXX)"
  cp "$TARGET" "$BACKUP"
fi
restore() {
  if [ -n "$BACKUP" ]; then cp "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
}
cat > "$TARGET" <<'NGINX'
# Pre-stage HTTP hosts before changing registrar NS.
server {
  listen 80;
  server_name broandbro.in www.broandbro.in;
  root /var/www/broandbro;
  index index.html;
  client_max_body_size 25m;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files $uri =404;
  }
  location = /.well-known/assetlinks.json {
    default_type application/json;
    try_files $uri =404;
  }
  location ~ /\. { deny all; }
  location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
}
server {
  listen 80;
  server_name api.broandbro.in;
  client_max_body_size 25m;
  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files $uri =404;
  }
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    proxy_read_timeout 120s;
  }
}
NGINX
if ! nginx -t; then
  echo "Nginx validation failed, restoring original configuration"
  restore
  nginx -t
  exit 1
fi
systemctl reload nginx
for HOST in broandbro.in www.broandbro.in; do
  HTTP="$(curl --noproxy '*' -sS --max-time 10 -o /dev/null -w '%{http_code}' -H "Host: $HOST" http://127.0.0.1/)"
  test "$HTTP" = 200 || { echo "Unexpected $HOST HTTP $HTTP"; exit 1; }
  echo "Staged $HOST HTTP 200"
done
API="$(curl --noproxy '*' -sS --max-time 15 -o /dev/null -w '%{http_code}' -H "Host: api.broandbro.in" http://127.0.0.1/actuator/health)"
test "$API" = 200 || { echo "Unexpected api.broandbro.in health $API"; exit 1; }
echo "Staged api.broandbro.in health HTTP 200"
