# =============================================================================
# DEV environment – Terraform backend config
# State stored at: env/dev/terraform.tfstate
# =============================================================================
terraform {
  backend "s3" {
    bucket         = "broandbro-tfstate-us-east-1"
    key            = "env/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "broandbro-tf-lock"
  }
}

