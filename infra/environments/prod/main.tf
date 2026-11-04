# =============================================================================
# PROD environment – main.tf
# Wires all modules together for the production environment.
# Deployed from the `main` branch via GitHub Actions (with approval gate).
# =============================================================================

terraform {
  required_version = ">= 1.11.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.8"
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

# ── Account-specific globally unique S3 names ───────────────────────────
data "aws_caller_identity" "current" {}

locals {
  frontend_bucket = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "broandbro-prod-ui-${data.aws_caller_identity.current.account_id}"
  media_bucket    = var.media_bucket_name != "" ? var.media_bucket_name : "broandbro-prod-media-${data.aws_caller_identity.current.account_id}"
  location_bucket = "broandbro-prod-locations-${data.aws_caller_identity.current.account_id}"
  artifact_bucket = "broandbro-prod-artifacts-${data.aws_caller_identity.current.account_id}"
}

module "media" {
  source      = "../../modules/media"
  environment = "prod"
  bucket_name = local.media_bucket
}
module "location_images" {
  source          = "../../modules/media"
  environment     = "prod"
  bucket_name     = local.location_bucket
  public_prefixes = ["locations"]
}
module "artifacts" {
  source      = "../../modules/artifacts"
  environment = "prod"
  bucket_name = local.artifact_bucket
}

# ── Automatic SSM application configuration ─────────────────────────────
module "ssm_config" {
  source                   = "../../modules/ssm-config"
  environment              = "prod"
  aws_region               = var.aws_region
  media_bucket_name        = local.media_bucket
  location_bucket_name     = local.location_bucket
  artifact_bucket_name     = local.artifact_bucket
  app_cors_allowed_origins = "https://${var.frontend_hostname}"
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
    var.frontend_hostname,
    var.api_hostname,
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
  domain_aliases                 = var.frontend_hostname == var.domain_name ? [var.domain_name, "www.${var.domain_name}"] : [var.frontend_hostname]
  price_class                    = "PriceClass_200"
  web_acl_id                     = var.cloudfront_web_acl_id
}

# ── S3 frontend bucket ────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  bucket_name                 = local.frontend_bucket # broandbro-prod-ui
  environment                 = "prod"
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

# ── EC2 backend ───────────────────────────────────────────────────────────────
module "ec2" {
  source = "../../modules/ec2"

  environment            = "prod"
  instance_type          = var.ec2_instance_type
  security_group_id      = module.security_group.ec2_sg_id
  media_bucket_arn       = module.media.bucket_arn
  location_bucket_arn    = module.location_images.bucket_arn
  create_media_s3_policy = true
  artifact_bucket_arn     = module.artifacts.bucket_arn
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

# ── Optional scheduled dev cost reduction (production opt-in only) ─────────
module "cost_schedule" {
  count            = var.enable_cost_schedule ? 1 : 0
  source           = "../../modules/cost-scheduler"
  environment      = "prod"
  aws_region       = var.aws_region
  timezone         = var.schedule_timezone
  ec2_instance_id  = module.ec2.instance_id
  rds_instance_id  = module.rds.db_instance_id
}

# ── Route53 DNS ───────────────────────────────────────────────────────────────
module "route53" {
  source = "../../modules/route53"

  hosted_zone_name          = var.domain_name
  apex_domain               = var.frontend_hostname
  api_subdomain             = var.api_hostname
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  ec2_elastic_ip            = module.ec2.elastic_ip
  create_www_record         = var.frontend_hostname == var.domain_name

}
