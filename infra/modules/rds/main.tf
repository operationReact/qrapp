# ============================================================
# Module: rds
# PostgreSQL RDS instance.
# – Encrypted storage
# – Automated backups
# – NOT publicly accessible
# – deletion_protection enabled in prod
# ============================================================

# Fetch default VPC subnets for RDS subnet group
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

# RDS subnet group – required even when using the default VPC
resource "aws_db_subnet_group" "this" {
  name       = "broandbro-${var.environment}-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "broandbro-${var.environment}-subnet-group"
    Environment = var.environment
  }
}

# ── Auto-discover the latest available PostgreSQL 16 minor version ────────────
# This avoids hard-coding a version that may not be available in ap-south-1.
data "aws_rds_engine_version" "postgres" {
  engine             = "postgres"
  version            = "16"
  preferred_versions = ["16.6", "16.5", "16.4", "16.3", "16.2", "16.1"]
}

# RDS PostgreSQL instance
resource "aws_db_instance" "this" {
  identifier = "broandbro-${var.environment}"

  engine         = "postgres"
  engine_version = data.aws_rds_engine_version.postgres.version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2 # autoscaling up to 2x
  storage_type          = "gp3"
  storage_encrypted     = true # encryption at rest

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]

  # Do NOT expose the DB to the public internet
  publicly_accessible = false

  # Automated backups
  backup_retention_period = var.backup_retention_days
  backup_window           = "02:00-03:00" # UTC (07:30–08:30 IST)
  maintenance_window      = "Mon:03:00-Mon:04:00"

  # Multi-AZ: enable in prod for high availability
  multi_az = var.multi_az

  # Protect prod from accidental terraform destroy
  deletion_protection = var.environment == "prod" ? true : false

  # Skip final snapshot in dev, take one in prod
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "broandbro-prod-final-${formatdate("YYYYMMDD", timestamp())}" : null

  # Apply changes immediately in dev, during maintenance window in prod
  apply_immediately = var.environment != "prod" ? true : false

  tags = {
    Name        = "broandbro-${var.environment}-postgres"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}
