# ============================================================
# Module: ec2
# Spring Boot backend on ARM64 Amazon Linux 2023.
# Includes: Elastic IP, IAM role (SSM + CloudWatch), Key Pair.
# ============================================================

# Latest Amazon Linux 2023 AMI for ARM64 (Graviton) in ap-south-1
data "aws_ami" "al2023_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── EC2 Key Pair ──────────────────────────────────────────────────────────────
resource "aws_key_pair" "this" {
  key_name   = "broandbro-${var.environment}-key"
  public_key = var.ec2_public_key

  tags = {
    Name        = "broandbro-${var.environment}-key"
    Environment = var.environment
  }
}

# ── IAM Role for EC2 ──────────────────────────────────────────────────────────
# Grants SSM Session Manager access (no bastion needed) + CloudWatch metrics
resource "aws_iam_role" "ec2" {
  name = "broandbro-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "broandbro-${var.environment}-ec2-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "broandbro-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
resource "aws_instance" "this" {
  ami                    = data.aws_ami.al2023_arm.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.this.key_name
  vpc_security_group_ids = [var.security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # Bootstrap script: install Java 21, Nginx, systemd service
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    environment = var.environment
  }))

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    encrypted             = true
    delete_on_termination = true
  }

  # Enable detailed monitoring in prod for 1-minute CloudWatch metrics
  monitoring = var.environment == "prod"

  tags = {
    Name        = "broandbro-${var.environment}-backend"
    Environment = var.environment
  }

  lifecycle {
    # Do not replace instance when a newer AMI is published.
    # Update AMI deliberately via terraform apply with -replace.
    ignore_changes = [ami, user_data]
  }
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
# Static public IP so DNS records don't change when instance is replaced.
resource "aws_eip" "this" {
  instance = aws_instance.this.id
  domain   = "vpc"

  tags = {
    Name        = "broandbro-${var.environment}-eip"
    Environment = var.environment
  }
}
