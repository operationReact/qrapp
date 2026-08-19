output "certificate_arn" {
  description = "Validated ACM certificate ARN - pass to CloudFront"
  value       = var.existing_certificate_arn != "" ? var.existing_certificate_arn : aws_acm_certificate_validation.this[0].certificate_arn
}
