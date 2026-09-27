# ─────────────────────────────────────────────────────────────────────────────
# broandbro DEV environment variables
# ─────────────────────────────────────────────────────────────────────────────

aws_region  = "us-east-1"
domain_name = "broandbro.in"

# Frontend S3 bucket
frontend_bucket_name = "broandbro-develop-ui"

# EC2 Backend
ec2_instance_type = "t4g.micro"

# SSH access (dev: open for convenience, tighten in prod)
ssh_allowed_cidrs = ["0.0.0.0/0"]

# RDS PostgreSQL
rds_instance_class = "db.t4g.micro"
db_name            = "broandbro_dev"
db_username        = "broandbro"

# CloudWatch – optional email for alarm notifications
alarm_email = ""

# ── Media bucket ──────────────────────────────────────────────────────────────
# Development media bucket for AI-generated menu images
media_bucket_name = "broandbro-dev-root-bucket"
