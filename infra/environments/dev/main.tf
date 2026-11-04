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
  allowed_account_ids = [var.expected_account_id]

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
  allowed_account_ids = [var.expected_account_id]

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

# Guard even direct Terraform CLI applies (not just GitHub workflow runs).
resource "terraform_data" "account_guard" {
  input = data.aws_caller_identity.current.account_id
  lifecycle {
    precondition {
      condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
      error_message = "Unsafe AWS account: caller identity does not match expected_account_id."
    }
  }
}

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
  app_cors_allowed_origins = "https://${var.frontend_hostname},http://localhost:5173"
}

# ── Terraform-created VPC and subnets (no default VPC reliance) ─────────────
module "network" {
  source      = "../../modules/network"
  environment = "dev"
  vpc_cidr    = "10.40.0.0/16"
}

# ── Security Groups ───────────────────────────────────────────────────────────
module "security_group" {
  source = "../../modules/security-group"

  environment       = "dev"
  vpc_id            = module.network.vpc_id
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

# ── ACM Certificate (us-east-1) ───────────────────────────────────────────────
module "acm" {
  source = "../../modules/acm"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.domain_name
  subject_alternative_names = [var.frontend_hostname, var.api_hostname]

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
  domain_aliases                 = [var.frontend_hostname]
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
  subnet_id              = module.network.public_subnet_id
  depends_on             = [module.network]
  media_bucket_arn       = module.media.bucket_arn
  location_bucket_arn    = module.location_images.bucket_arn
  create_media_s3_policy = true
  artifact_bucket_arn     = module.artifacts.bucket_arn
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment           = "dev"
  subnet_ids            = module.network.private_subnet_ids
  security_group_id     = module.security_group.rds_sg_id
  instance_class        = var.rds_instance_class # db.t4g.micro
  allocated_storage     = 20
  db_name               = var.db_name
  db_username           = var.db_username
  backup_retention_days = 3
  multi_az              = false
}

# EC2 reads ONLY the RDS-managed master secret of its own environment.
resource "aws_iam_role_policy" "db_secret_reader" {
  name = "broandbro-dev-db-secret-reader"
  role = module.ec2.role_name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = module.rds.db_secret_arn
    }]
  })
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
  rds_start_cron   = var.schedule_rds_start_cron
  ec2_start_cron   = var.schedule_ec2_start_cron
  ec2_stop_cron    = var.schedule_ec2_stop_cron
  rds_stop_cron    = var.schedule_rds_stop_cron
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
  create_www_record         = false
}
