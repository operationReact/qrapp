# SSM contract for application configuration.
# External values are created as placeholders, then entered by the operator.
# AWS provider 6.8+ write-only values prevent secrets being written to Terraform state.
variable "environment" { type = string }
variable "aws_region" { type = string }
variable "media_bucket_name" { type = string }
variable "location_bucket_name" { type = string }
variable "app_cors_allowed_origins" { type = string }

locals {
  base = "/broandbro/backend/${var.environment}"
  external_paths = toset([
    "openai/apiKey",
    "razorpay/key",
    "razorpay/secret",
    "razorpay/webhookSecret",
    "whatsapp/webhookVerifyToken",
    "whatsapp/appSecret",
    "whatsapp/phoneNumberId",
    "whatsapp/accessToken"
  ])
  generated_settings = {
    "aws/s3/bucketName"         = var.media_bucket_name
    "aws/s3/locationBucketName" = var.location_bucket_name
    "aws/s3/region"             = var.aws_region
    "aws/s3/enabled"            = "true"
    "app/cors/allowedOrigins"   = var.app_cors_allowed_origins
  }
}

resource "aws_ssm_parameter" "generated" {
  for_each    = local.generated_settings
  name        = "${local.base}/${each.key}"
  description = "Terraform-generated application setting (${var.environment})"
  type        = "String"
  tier        = "Standard"
  value       = each.value
  tags        = { Environment = var.environment, ManagedBy = "Terraform" }
}

resource "aws_ssm_parameter" "external" {
  for_each    = local.external_paths
  name        = "${local.base}/${each.value}"
  description = "External service configuration. Replace placeholder via authenticated operator process."
  type        = "SecureString"
  tier        = "Standard"
  value_wo    = "MISSING_EXTERNAL_CREDENTIAL"
  value_wo_version = 1
  lifecycle {
    # Never overwrite manual updates (or rotated external API credentials).
    ignore_changes = [value_wo]
  }
  tags = { Environment = var.environment, ManagedBy = "Terraform", ValueOwner = "Operator" }
}

output "external_parameter_names" {
  value = [for p in aws_ssm_parameter.external : p.name]
}
output "generated_parameter_names" {
  value = [for p in aws_ssm_parameter.generated : p.name]
}
