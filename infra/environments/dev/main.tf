# =============================================================================
# DEV environment – main.tf
# Wires all modules together for the dev environment.
# Deployed from the `dev` branch via GitHub Actions.
# =============================================================================

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# ── Providers ─────────────────────────────────────────────────────────────────
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "broandbro"
      Environment = "dev"
      ManagedBy   = "Terraform"
      Branch      = "dev"
    }
  }
}

# us-east-1 alias is REQUIRED for ACM certificates used by CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "broandbro"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

# ── Shared media bucket (AI-generated menu item images) ──────────────────────
# Created here in the dev environment so it exists before any data sources
# reference it. lifecycle.prevent_destroy ensures it is never deleted.
# Prod references it via a data source (see environments/prod/main.tf).
# This is a SHARED bucket used by ALL environments (dev, prod).
resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name

  lifecycle {
    prevent_destroy = true
    # Ignore tag drift (both resource-level tags and provider default_tags).
    # This prevents the bucket from being replaced after a partial create
    # (e.g. when PutBucketTagging failed on a previous apply).
    ignore_changes = [tags, tags_all]
  }

  tags = {
    Name      = var.media_bucket_name
    Purpose   = "AI-generated menu item images - shared across all environments"
    ManagedBy = "Terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Suspended"
  }
}

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

resource "aws_s3_bucket_policy" "media" {
  bucket     = aws_s3_bucket.media.id
  depends_on = [aws_s3_bucket_public_access_block.media]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountUploads"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
        Resource = [
          "${aws_s3_bucket.media.arn}/menu-items/*",
          "${aws_s3_bucket.media.arn}/locations/menu-images/*"
        ]
      },
      {
        Sid       = "PublicReadMenuImages"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource = [
          "${aws_s3_bucket.media.arn}/menu-items/*",
          "${aws_s3_bucket.media.arn}/locations/menu-images/*"
        ]
      },
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

data "aws_caller_identity" "current" {}

# ── Security Groups ───────────────────────────────────────────────────────────
module "security_group" {
  source = "../../modules/security-group"

  environment       = "dev"
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

# ── ACM Certificate (us-east-1) ───────────────────────────────────────────────
module "acm" {
  source = "../../modules/acm"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.domain_name
  subject_alternative_names = [
    "develop.${var.domain_name}",
    "dev-api.${var.domain_name}",
  ]
  hosted_zone_name            = var.domain_name
  environment                 = "dev"
  existing_certificate_arn    = var.existing_certificate_arn
}

# ── CloudFront distribution (created before S3 to get its ARN) ───────────────
module "cloudfront" {
  source = "../../modules/cloudfront"

  environment                    = "dev"
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  s3_oac_id                      = module.s3.oac_id
  acm_certificate_arn            = module.acm.certificate_arn
  domain_aliases                 = ["develop.${var.domain_name}"]
  price_class                    = "PriceClass_100" # cheapest – fine for dev
}

# ── S3 frontend bucket ────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  bucket_name                 = var.frontend_bucket_name # broandbro-develop-ui
  environment                 = "dev"
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

# ── EC2 backend ───────────────────────────────────────────────────────────────
module "ec2" {
  source = "../../modules/ec2"

  environment            = "dev"
  instance_type          = var.ec2_instance_type
  security_group_id      = module.security_group.ec2_sg_id
  media_bucket_arn       = aws_s3_bucket.media.arn
  create_media_s3_policy = true
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment           = "dev"
  vpc_id                = module.security_group.vpc_id
  security_group_id     = module.security_group.rds_sg_id
  instance_class        = var.rds_instance_class # db.t4g.micro
  allocated_storage     = 20
  db_name               = var.db_name
  db_username           = var.db_username
  backup_retention_days = 3
  multi_az              = false
}

# ── CloudWatch Monitoring ─────────────────────────────────────────────────────
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment        = "dev"
  aws_region         = var.aws_region
  ec2_instance_id    = module.ec2.instance_id
  log_retention_days = 30
  alarm_email        = var.alarm_email
}

# ── Route53 DNS ───────────────────────────────────────────────────────────────
module "route53" {
  source = "../../modules/route53"

  hosted_zone_name          = var.domain_name
  apex_domain               = "develop.${var.domain_name}"
  api_subdomain             = "dev-api.${var.domain_name}"
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  ec2_elastic_ip            = module.ec2.elastic_ip
  create_www_record         = false # dev doesn't need www
}

