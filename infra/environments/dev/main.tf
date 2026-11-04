# =============================================================================
# DEV environment – main.tf
# Wires all modules together for the dev environment.
# Deployed from the `dev` branch via GitHub Actions.
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

# ── Account-specific globally unique S3 names ───────────────────────────
data "aws_caller_identity" "current" {}

locals {
  frontend_bucket = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "broandbro-dev-ui-${data.aws_caller_identity.current.account_id}"
  media_bucket    = var.media_bucket_name != "" ? var.media_bucket_name : "broandbro-dev-media-${data.aws_caller_identity.current.account_id}"
  location_bucket = "broandbro-dev-locations-${data.aws_caller_identity.current.account_id}"
  artifact_bucket = "broandbro-dev-artifacts-${data.aws_caller_identity.current.account_id}"
}

module "media" {
  source      = "../../modules/media"
  environment = "dev"
  bucket_name = local.media_bucket
}
module "location_images" {
  source          = "../../modules/media"
  environment     = "dev"
  bucket_name     = local.location_bucket
  public_prefixes = ["locations"]
}
module "artifacts" {
  source      = "../../modules/artifacts"
  environment = "dev"
  bucket_name = local.artifact_bucket
}

# ── Automatic SSM application configuration ─────────────────────────────
module "ssm_config" {
  source                   = "../../modules/ssm-config"
  environment              = "dev"
  aws_region               = var.aws_region
  media_bucket_name        = local.media_bucket
  location_bucket_name     = local.location_bucket
  artifact_bucket_name     = local.artifact_bucket
  app_cors_allowed_origins = "https://develop.broandbro.in,http://localhost:5173"
}

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

  bucket_name                 = local.frontend_bucket # broandbro-develop-ui
  environment                 = "dev"
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

# ── EC2 backend ───────────────────────────────────────────────────────────────
module "ec2" {
  source = "../../modules/ec2"

  environment            = "dev"
  instance_type          = var.ec2_instance_type
  security_group_id      = module.security_group.ec2_sg_id
  media_bucket_arn       = module.media.bucket_arn
  location_bucket_arn    = module.location_images.bucket_arn
  create_media_s3_policy = true
  artifact_bucket_arn     = module.artifacts.bucket_arn
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

# ── Optional scheduled dev cost reduction (production opt-in only) ─────────
module "cost_schedule" {
  count            = var.enable_cost_schedule ? 1 : 0
  source           = "../../modules/cost-scheduler"
  environment      = "dev"
  aws_region       = var.aws_region
  timezone         = var.schedule_timezone
  ec2_instance_id  = module.ec2.instance_id
  rds_instance_id  = module.rds.db_instance_id
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
