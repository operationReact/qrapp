#!/bin/bash
# =============================================================================
# broandbro EC2 Bootstrap Script
# Runs automatically on first boot via EC2 user_data.
#
# What this script does:
#   1. Updates the OS
#   2. Installs Amazon Corretto 21 (Java 21, ARM/Graviton native)
#   3. Installs Nginx
#   4. Creates a dedicated 'broandbro' system user (no shell)
#   5. Creates /opt/broandbro app directory structure
#   6. Writes a systemd service unit
#   7. Writes the Nginx reverse-proxy config
#   8. Enables + starts Nginx (app will start once JAR is deployed)
# =============================================================================
set -euo pipefail
exec > >(tee /var/log/broandbro-bootstrap.log | logger -t broandbro-bootstrap) 2>&1

ENVIRONMENT="${environment}"   # injected by Terraform templatefile()
APP_DIR="/opt/broandbro"
APP_USER="broandbro"
SERVICE="broandbro"

echo "=== broandbro bootstrap starting — env: $ENVIRONMENT ==="

# ── 1. OS update ──────────────────────────────────────────────────────────────
dnf update -y

# ── 2. Install Java 21 (Amazon Corretto ARM64) ────────────────────────────────
dnf install -y java-21-amazon-corretto-headless
java -version

# ── 3. Install Nginx ──────────────────────────────────────────────────────────
dnf install -y nginx

# ── 4. System user for running the app (least privilege) ─────────────────────
useradd --system --no-create-home --shell /sbin/nologin "$APP_USER" 2>/dev/null || true

# ── 5. Directory structure ────────────────────────────────────────────────────
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/config"

# Placeholder env file – CI/CD overwrites this on each deploy
cat > "$APP_DIR/config/application.env" << 'EOF'
# Spring Boot environment variables
# Populated by CI/CD pipeline before service restart
SPRING_PROFILES_ACTIVE=placeholder
SERVER_PORT=8080
EOF

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
chmod 640 "$APP_DIR/config/application.env"

# ── 6. Systemd service unit ───────────────────────────────────────────────────
cat > "/etc/systemd/system/$SERVICE.service" << EOF
[Unit]
Description=broandbro Spring Boot Application ($ENVIRONMENT)
Documentation=https://github.com/YOUR_ORG/broandbro
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR

# Load env vars (DB password, Spring profile, etc.)
EnvironmentFile=$APP_DIR/config/application.env

# JVM flags: tuned for Graviton (ARM64) small instances
ExecStart=/usr/bin/java \\
  -Xms256m -Xmx512m \\
  -XX:+UseG1GC \\
  -XX:+ExitOnOutOfMemoryError \\
  -Djava.security.egd=file:/dev/./urandom \\
  -jar $APP_DIR/app.jar

ExecStop=/bin/kill -15 \$MAINPID
SuccessExitStatus=143

Restart=on-failure
RestartSec=15
StartLimitBurst=3
StartLimitInterval=60

# Logging goes to journald (use: journalctl -u broandbro -f)
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=$APP_DIR
PrivateTmp=yes
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE"
# Don't start yet – app.jar is deployed by CI/CD, not present at boot

# ── 7. Nginx reverse-proxy config ────────────────────────────────────────────
# Remove default site
rm -f /etc/nginx/conf.d/default.conf

cat > "/etc/nginx/conf.d/broandbro.conf" << 'NGINX'
# broandbro backend – Nginx reverse proxy
# Proxies HTTP → Spring Boot on 8080
# HTTPS termination is handled by EC2 security group + ACM (if ALB used later)

server {
    listen 80 default_server;
    server_name _;

    # Increase timeouts for large file uploads / slow Spring Boot startup
    proxy_connect_timeout  60s;
    proxy_send_timeout     60s;
    proxy_read_timeout     120s;
    send_timeout           60s;

    # Security headers
    add_header X-Frame-Options           "SAMEORIGIN"  always;
    add_header X-Content-Type-Options    "nosniff"     always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    # Health check endpoint (load balancer / Route53 health checks use this)
    location /actuator/health {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host $host;
        access_log         off;
    }

    # Main app – proxy everything to Spring Boot
    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_buffering    off;
    }

    # Nginx status (internal only – for monitoring)
    location /nginx_status {
        stub_status;
        allow 127.0.0.1;
        deny  all;
    }
}
NGINX

nginx -t  # Validate config before enabling
systemctl enable nginx
systemctl start nginx

# ── 8. Install CloudWatch agent ───────────────────────────────────────────────
dnf install -y amazon-cloudwatch-agent 2>/dev/null || true

# Minimal CloudWatch config – sends app logs + system metrics
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << CWCONFIG
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/broandbro/logs/*.log",
            "log_group_name": "/broandbro/$ENVIRONMENT/app",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/broandbro/$ENVIRONMENT/nginx-error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["disk_used_percent"], "resources": ["/"] }
    },
    "append_dimensions": {
      "Environment": "$ENVIRONMENT"
    }
  }
}
CWCONFIG

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s 2>/dev/null || true

echo "=== broandbro bootstrap complete at $(date -u) ==="
