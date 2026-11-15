output "certificate_arn" {
  description = "Validated ACM certificate ARN - pass to CloudFront"
  value       = var.existing_certificate_arn != "" ? var.existing_certificate_arn : aws_acm_certificate_validation.this[0].certificate_arn
}

# The raw certificate request ARN is available before DNS validation completes.
# CloudFront should still depend on certificate_arn (the validated ARN) above.
output "requested_certificate_arn" {
  description = "ACM certificate request ARN for pre-cutover cross-account DNS validation"
  value       = var.existing_certificate_arn != "" ? var.existing_certificate_arn : aws_acm_certificate.this[0].arn
}
