# ─────────────────────────────────────────────────────────────────────────────
# broandbro PROD environment variables
# ─────────────────────────────────────────────────────────────────────────────

aws_region  = "us-east-1"
domain_name = "broandbro.in"

# Frontend S3 bucket
frontend_bucket_name = "broandbro-prod-ui"

# EC2 Backend
ec2_instance_type = "t4g.small"

# SSH access (prod: restrict to specific IPs)
ssh_allowed_cidrs = ["0.0.0.0/0"]  # TIGHTEN THIS in production!

# RDS PostgreSQL
rds_instance_class = "db.t4g.small"
db_name            = "broandbro"
db_username        = "broandbro"

# CloudWatch – email for alarm notifications
alarm_email = ""

# ── Media bucket ──────────────────────────────────────────────────────────────
# Shared media bucket used by all environments
media_bucket_name = "broandbro-menu-images-shared"
