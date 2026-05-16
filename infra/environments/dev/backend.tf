# =============================================================================
# DEV environment – Terraform backend config
# State stored at: env/dev/terraform.tfstate
# =============================================================================
terraform {
  backend "s3" {
    bucket         = "broandbro-tfstate-ap-south-1"
    key            = "env/dev/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "broandbro-terraform-locks"
  }
}

