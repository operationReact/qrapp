# ============================================================
# broandbro – Terraform Bootstrap
# Run ONCE before any environment deployment.
#
#   cd infra/bootstrap
#   terraform init
#   terraform apply
#
# This creates the S3 bucket + DynamoDB table used as the
# remote backend for ALL environments.
# ============================================================

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
  # Bootstrap itself uses LOCAL state – it's the only exception.
}

provider "aws" {
  region = "ap-south-1"
}

# ── S3 bucket for remote state storage ───────────────────────────────────────
resource "aws_s3_bucket" "tfstate" {
  bucket = "broandbro-tfstate-ap-south-1"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name      = "broandbro-tfstate"
    ManagedBy = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Only this account may access the state bucket
resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonSSL"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}

# ── DynamoDB table for state locking ─────────────────────────────────────────
resource "aws_dynamodb_table" "tf_lock" {
  name         = "broandbro-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name      = "broandbro-terraform-locks"
    ManagedBy = "Terraform"
  }
}

# ── GitHub OIDC Provider ──────────────────────────────────────────────────────
# Allows GitHub Actions to assume IAM roles without storing long-lived keys.
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint (stable – do not change)
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name      = "github-oidc"
    ManagedBy = "Terraform"
  }
}

# ── IAM Role assumed by GitHub Actions ───────────────────────────────────────
# Update "YOUR_GITHUB_ORG/YOUR_REPO" below before applying.
resource "aws_iam_role" "github_actions" {
  name = "broandbro-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            # IMPORTANT: Replace with your GitHub org/repo
            "token.actions.githubusercontent.com:sub" = "repo:YOUR_GITHUB_ORG/broandbro:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name      = "broandbro-github-actions-role"
    ManagedBy = "Terraform"
  }
}

# Attach AWS managed AdministratorAccess for simplicity at the start.
# Tighten this to a custom least-privilege policy once stable.
resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "tfstate_bucket" {
  value       = aws_s3_bucket.tfstate.bucket
  description = "S3 bucket name – put this in environments backend.tf"
}

output "tf_lock_table" {
  value       = aws_dynamodb_table.tf_lock.name
  description = "DynamoDB table name – put this in environments backend.tf"
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "ARN for AWS_ROLE_ARN GitHub Actions secret"
}

output "github_oidc_provider_arn" {
  value       = aws_iam_openid_connect_provider.github.arn
  description = "GitHub OIDC provider ARN"
}
