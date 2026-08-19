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

# ── Shared media bucket (AI-generated menu item images) ──────────────────────
# This bucket is created by dev/main.tf and shared across ALL environments.
# Prod looks it up via data source so we can reference its ARN without re-creating.
data "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
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
  create_media_s3_policy = true
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

