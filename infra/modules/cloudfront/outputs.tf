output "distribution_id" {
  value       = aws_cloudfront_distribution.this.id
  description = "Used for cache invalidation in CI/CD"
}

output "distribution_arn" {
  value       = aws_cloudfront_distribution.this.arn
  description = "Used in S3 bucket policy"
}

output "domain_name" {
  value       = aws_cloudfront_distribution.this.domain_name
  description = "*.cloudfront.net domain for Route53 alias"
}

output "hosted_zone_id" {
  value       = aws_cloudfront_distribution.this.hosted_zone_id
  description = "CloudFront hosted zone ID for Route53 alias records"
}
