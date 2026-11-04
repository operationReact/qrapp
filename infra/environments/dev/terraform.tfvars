# ─────────────────────────────────────────────────────────────────────────────
# broandbro DEV environment variables
# ─────────────────────────────────────────────────────────────────────────────

aws_region  = "ap-south-1"
domain_name = "broandbro.in"

# Frontend S3 bucket
frontend_bucket_name = "" # Generated per AWS account

# EC2 Backend
ec2_instance_type = "t4g.micro"

# SSH access (dev: open for convenience, tighten in prod)
ssh_allowed_cidrs = [] # Systems Manager only, no inbound SSH

# RDS PostgreSQL
rds_instance_class = "db.t4g.micro"
db_name            = "broandbro_dev"
db_username        = "broandbro"

# CloudWatch – optional email for alarm notifications
alarm_email = ""

# ── Media bucket ──────────────────────────────────────────────────────────────
# Development media bucket for AI-generated menu images
media_bucket_name = "" # Generated per AWS account

# Customer-facing deployment: keep EC2 and RDS running 24/7.
enable_cost_schedule = false
