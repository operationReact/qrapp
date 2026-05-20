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
  name         = "broandbro-tf-lock"
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
      Name      = "broandbro-tf-lock"
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

# =============================================================================
# Shared Media Bucket – AI-generated menu item images
# Used by ALL environments (dev + prod).  Created once here in bootstrap so
# there is only ever one bucket and no per-environment naming.
# Spring Boot uploads to  menu-items/{id}/{uuid}.png
# Images are served via direct S3 HTTPS URLs stored in menu_item.image_url.
# =============================================================================

locals {
  media_bucket_name = "broandbro-menu-images"
}

resource "aws_s3_bucket" "media" {
  bucket = local.media_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name      = local.media_bucket_name
    Purpose   = "AI-generated menu item images – shared across all environments"
    ManagedBy = "Terraform"
  }
}

# ── Allow public read so stored image URLs resolve in the browser ─────────────
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  # Public ACLs are not used – access is granted by bucket policy only
  block_public_acls       = true
  ignore_public_acls      = true
  # Policy-based public read IS needed for direct image URLs
  block_public_policy     = false
  restrict_public_buckets = false
}

# ── Server-side encryption ────────────────────────────────────────────────────
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── Versioning disabled (images are immutable UUID-named files) ───────────────
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Suspended"
  }
}

# ── Lifecycle: auto-delete objects older than 1 year to control cost ──────────
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-old-images"
    status = "Enabled"
    filter {}

    expiration {
      days = 365
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# ── CORS: allow browsers to load images ──────────────────────────────────────
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 86400
  }
}

# ── Bucket policy ─────────────────────────────────────────────────────────────
# • Any AWS principal in this account may upload to menu-items/*  (dev + prod EC2)
# • Anyone on the internet may GET/HEAD menu-items/* (public image URLs)
# • Non-SSL access is denied for uploads
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  # must come after the public-access-block that allows policy-based public reads
  depends_on = [aws_s3_bucket_public_access_block.media]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow EC2 instance roles from any environment in this account to upload
      {
        Sid    = "AllowAccountUploads"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.media.arn}/menu-items/*"
      },
      # Public read so stored image URLs work in the browser
      {
        Sid       = "PublicReadMenuImages"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject", "s3:HeadObject"]
        Resource  = "${aws_s3_bucket.media.arn}/menu-items/*"
      },
      # Deny non-SSL uploads
      {
        Sid       = "DenyNonSSLUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}

# Current AWS account ID – used in the bucket policy above
data "aws_caller_identity" "current" {}

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

output "media_bucket_name" {
  value       = aws_s3_bucket.media.bucket
  description = "Shared S3 bucket for AI-generated menu item images (all environments)"
}

output "media_bucket_arn" {
  value       = aws_s3_bucket.media.arn
  description = "ARN of the shared media bucket – use in EC2 IAM policies"
}

output "media_bucket_regional_domain" {
  value       = aws_s3_bucket.media.bucket_regional_domain_name
  description = "Regional domain name for the shared media bucket"
}

