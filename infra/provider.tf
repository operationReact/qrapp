# =============================================================================
# This file exists at the infra/ root only as documentation.
# DO NOT run terraform commands from infra/ directly.
#
# Use the environment directories:
#   infra/environments/dev/   ← for dev
#   infra/environments/prod/  ← for prod
#
# Each environment directory has its own provider config.
# =============================================================================

# Primary AWS provider – ap-south-1 (Mumbai)
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "broandbro"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Secondary provider in us-east-1 – required for ACM certs used with CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "broandbro"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
