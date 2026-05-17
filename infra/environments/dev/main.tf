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
    "dev.${var.domain_name}",
    "dev-api.${var.domain_name}",
  ]
  hosted_zone_name = var.domain_name
  environment      = "dev"
}

# ── CloudFront distribution (created before S3 to get its ARN) ───────────────
module "cloudfront" {
  source = "../../modules/cloudfront"

  environment                    = "dev"
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  s3_oac_id                      = module.s3.oac_id
  acm_certificate_arn            = module.acm.certificate_arn
  domain_aliases                 = ["dev.${var.domain_name}"]
  price_class                    = "PriceClass_100" # cheapest – fine for dev
}

# ── S3 frontend bucket ────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  bucket_name                 = var.frontend_bucket_name # broandbro-dev-ui
  environment                 = "dev"
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

# ── EC2 backend ───────────────────────────────────────────────────────────────
module "ec2" {
  source = "../../modules/ec2"

  environment       = "dev"
  instance_type     = var.ec2_instance_type # t4g.micro
  security_group_id = module.security_group.ec2_sg_id
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

# ── Route53 DNS ───────────────────────────────────────────────────────────────
module "route53" {
  source = "../../modules/route53"

  hosted_zone_name          = var.domain_name
  apex_domain               = "dev.${var.domain_name}"
  api_subdomain             = "dev-api.${var.domain_name}"
  cloudfront_domain_name    = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  ec2_elastic_ip            = module.ec2.elastic_ip
  create_www_record         = false # dev doesn't need www
  domain_name               = var.domain_name
}

