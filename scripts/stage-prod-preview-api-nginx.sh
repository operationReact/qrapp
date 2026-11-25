#!/usr/bin/env bash
# Explicit preview API vhost for Certbot. Never changes main-domain DNS or vhosts.
set -euo pipefail

TARGET="/etc/nginx/conf.d/broandbro-preview-api.conf"
BACKUP=""
if [ -f "$TARGET" ]; then
  BACKUP="$(mktemp /tmp/broandbro-preview-api.XXXXXX)"
  cp -p "$TARGET" "$BACKUP"
fi

restore_on_error() {
  status=$?
  if [ "$status" -ne 0 ]; then
    if [ -n "$BACKUP" ]; then cp -p "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
    nginx -t && systemctl reload nginx || true
  fi
  if [ -n "$BACKUP" ]; then rm -f "$BACKUP"; fi
  exit "$status"
}
trap restore_on_error EXIT

# Certbot adds a 443 listener to this file. Never overwrite an issued certificate vhost.
if [ -f "$TARGET" ] && grep -Eq 'listen[[:space:]]+443([[:space:]]|;)' "$TARGET"; then
  echo "Existing preview API TLS vhost retained"
  nginx -t
  systemctl reload nginx
  test "$(curl --noproxy '*' --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}' -H 'Host: migrate-prod-api.broandbro.in' http://127.0.0.1/actuator/health)" = "200"
  exit 0
fi

cat > "$TARGET" <<'NGINX'
# Preview-only API host, new AWS account. HTTPS added by certbot after public DNS is ready.
server {
  listen 80;
  server_name migrate-prod-api.broandbro.in;
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
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
  }
}
NGINX

nginx -t
systemctl reload nginx
for attempt in $(seq 1 6); do
  code="$(curl --noproxy '*' --silent --show-error --max-time 10 -o /dev/null -w '%{http_code}' \
    -H 'Host: migrate-prod-api.broandbro.in' http://127.0.0.1/actuator/health || true)"
  if [ "$code" = "200" ]; then
    echo "Preview API Nginx staged; local health HTTP 200"
    exit 0
  fi
  sleep 2
done
echo "Unexpected preview API local health HTTP ${code:-000}"
exit 1
