terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.50"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

variable "domain_name" {
  description = "Primary domain for the certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional domains to include in the certificate"
  type        = list(string)
  default     = []
}

variable "hosted_zone_name" {
  description = "Route53 hosted zone name (e.g. broandbro.in)"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev | prod)"
  type        = string
}
