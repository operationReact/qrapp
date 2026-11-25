#!/usr/bin/env bash
# Activate HTTPS for the main production hosts ONLY when the GitHub workflow
# has verified public DNS matches the target new-account EC2.
# This script never changes DNS, S3, RDS, security groups or public IPs.
set -euo pipefail
test -s /var/www/broandbro/index.html || { echo "Frontend SPA missing"; exit 1; }

for host in broandbro.in www.broandbro.in; do
  status="$(curl --noproxy '*' --silent --show-error --max-time 15 \
    -o /dev/null -w '%{http_code}' -H "Host: $host" http://127.0.0.1/ || true)"
  if [ "$status" != "200" ] && [ "$status" != "301" ] && [ "$status" != "302" ]; then
    echo "Main frontend $host local HTTP preflight failed: $status"
    exit 1
  fi
done

nginx -t
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  -d broandbro.in -d www.broandbro.in --redirect
nginx -t
for host in broandbro.in www.broandbro.in; do
  curl --noproxy '*' --fail --silent --show-error --max-time 15 \
    --resolve "$host:443:127.0.0.1" "https://$host/" >/dev/null
  echo "Main frontend $host local HTTPS passed"
done

# Explicit main API vhost was prepared on this EC2 ahead of DNS cutover.
nginx -t
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  -d api.broandbro.in --redirect
nginx -t
curl --noproxy '*' --fail --silent --show-error --max-time 15 \
  --resolve 'api.broandbro.in:443:127.0.0.1' \
  https://api.broandbro.in/actuator/health >/dev/null
echo "Main API local HTTPS health passed"
