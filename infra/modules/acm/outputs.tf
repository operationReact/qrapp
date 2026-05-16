output "certificate_arn" {
  description = "Validated ACM certificate ARN – pass to CloudFront"
  value       = aws_acm_certificate_validation.this.certificate_arn
}
