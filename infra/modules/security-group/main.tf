# ============================================================
# Module: security-group
# Creates two security groups:
#   ec2_sg  – web traffic + SSH ingress, all egress
#   rds_sg  – port 5432 only from ec2_sg (no internet access)
# ============================================================

data "aws_vpc" "default" {
  default = true
}

# ── EC2 Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "ec2" {
  name        = "broandbro-${var.environment}-ec2-sg"
  description = "Backend EC2: HTTP, HTTPS, SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  ingress {
    description = "HTTP (nginx)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS (nginx TLS termination)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "broandbro-${var.environment}-ec2-sg"
    Environment = var.environment
  }
}

# ── RDS Security Group ────────────────────────────────────────────────────────
# PostgreSQL accessible from EC2 and from local dev IPs (var.local_dev_cidrs).
resource "aws_security_group" "rds" {
  name        = "broandbro-${var.environment}-rds-sg"
  description = "RDS PostgreSQL: only EC2 sg may connect"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  dynamic "ingress" {
    for_each = length(var.local_dev_cidrs) > 0 ? [1] : []
    content {
      description = "PostgreSQL from local dev"
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = var.local_dev_cidrs
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "broandbro-${var.environment}-rds-sg"
    Environment = var.environment
  }
}

