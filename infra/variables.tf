# =============================================================================
# ROOT-LEVEL NOTE: Do not run terraform from this directory.
# See infra/environments/dev/ and infra/environments/prod/ instead.
# This file documents the variables used across environments.
# =============================================================================

variable "aws_region" {
  description = "AWS region for primary resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be dev or prod."
  }
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "broandbro.in"
}

variable "db_password" {
  description = "RDS PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "ec2_public_key" {
  description = "Public key material for the EC2 key pair"
  type        = string
}
