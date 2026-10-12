# =============================================================================
# PROD environment – main.tf
# Wires all modules together for the production environment.
# Deployed from the `main` branch via GitHub Actions (with approval gate).
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
      Environment = "prod"
      ManagedBy   = "Terraform"
      Branch      = "main"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "broandbro"
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

# ── Production media bucket (AI-generated menu item images) ──────────────────
# Prod looks up its existing media bucket via data source so we can reference
# its ARN without re-creating it in this stack.
data "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
}

# ── Allow public read access for media bucket ──────────────────────────────────
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = data.aws_s3_bucket.media.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ── Bucket policy: allow public read access for images ────────────────────────
resource "aws_s3_bucket_policy" "media" {
  bucket = data.aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPublicRead"
        Effect = "Allow"
        Principal = "*"
        Action   = "s3:GetObject"
        Resource = "${data.aws_s3_bucket.media.arn}/*"
      },
      {
        Sid       = "DenyNonSSL"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          data.aws_s3_bucket.media.arn,
          "${data.aws_s3_bucket.media.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# ── CORS configuration for browser access ──────────────────────────────────────
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = data.aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag", "x-amz-version-id"]
    max_age_seconds = 3000
  }

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# ── Security Groups ───────────────────────────────────────────────────────────
module "security_group" {
  source = "../../modules/security-group"

  environment       = "prod"
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
    "www.${var.domain_name}",
    "api.${var.domain_name}",
  ]
  hosted_zone_name            = var.domain_name
  environment                 = "prod"
  existing_certificate_arn    = var.existing_certificate_arn
}

# ── CloudFront distribution ───────────────────────────────────────────────────
module "cloudfront" {
  source = "../../modules/cloudfront"

  environment                    = "prod"
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  s3_oac_id                      = module.s3.oac_id
  acm_certificate_arn            = module.acm.certificate_arn
  domain_aliases                 = [var.domain_name, "www.${var.domain_name}"]
  price_class                    = "PriceClass_200"
  web_acl_id                     = var.cloudfront_web_acl_id
}

# ── S3 frontend bucket ────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  bucket_name                 = var.frontend_bucket_name # broandbro-prod-ui
  environment                 = "prod"
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

# ── EC2 backend ───────────────────────────────────────────────────────────────
module "ec2" {
  source = "../../modules/ec2"

  environment            = "prod"
  instance_type          = var.ec2_instance_type
  security_group_id      = module.security_group.ec2_sg_id
  media_bucket_arn       = data.aws_s3_bucket.media.arn
  location_bucket_arn    = "arn:aws:s3:::broandbro-location-images-prod"
  create_media_s3_policy = true
  root_volume_size       = 30
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment           = "prod"
  vpc_id                = module.security_group.vpc_id
  security_group_id     = module.security_group.rds_sg_id
  instance_class        = var.rds_instance_class # db.t4g.small
  allocated_storage     = 20
  db_name               = var.db_name
  db_username           = var.db_username
  backup_retention_days = 7
  multi_az              = false # set true (~$26/mo) when uptime is critical
}

# ── CloudWatch Monitoring ─────────────────────────────────────────────────────
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment        = "prod"
  aws_region         = var.aws_region
  ec2_instance_id    = module.ec2.instance_id
  log_retention_days = 90
  alarm_email        = var.alarm_email
}

# ── Route53 DNS ───────────────────────────────────────────────────────────────
module "route53" {
  source = "../../modules/route53"

  hosted_zone_name          = var.domain_name
  apex_domain               = var.domain_name
  api_subdomain             = "api.${var.domain_name}"
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  ec2_elastic_ip            = module.ec2.elastic_ip
  create_www_record         = true

}
