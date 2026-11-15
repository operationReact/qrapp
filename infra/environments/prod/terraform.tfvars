# ─────────────────────────────────────────────────────────────────────────────
# broandbro PROD environment variables
# ─────────────────────────────────────────────────────────────────────────────

aws_region  = "ap-south-1"
domain_name = "broandbro.in"

# Frontend S3 bucket
frontend_bucket_name = "" # Generated per AWS account

# EC2 Backend
ec2_instance_type = "t4g.small"

# SSH access (prod: restrict to specific IPs)
ssh_allowed_cidrs = [] # Systems Manager only, no inbound SSH

# RDS PostgreSQL
rds_instance_class = "db.t4g.small"
db_name            = "broandbro"
db_username        = "broandbro"

# CloudWatch – email for alarm notifications
alarm_email = ""

# ── Media bucket ──────────────────────────────────────────────────────────────
# Production media bucket for AI-generated menu images
media_bucket_name = "" # Generated per AWS account
