# =============================================================================
# PROD environment – Terraform backend config
# State stored at: env/prod/terraform.tfstate
# =============================================================================
terraform {
  backend "s3" {
    bucket         = "broandbro-tfstate-ap-south-1"
    key            = "env/prod/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "broandbro-tf-lock"
  }
}

