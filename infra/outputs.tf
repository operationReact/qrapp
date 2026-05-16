output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain"
  value       = module.cloudfront.domain_name
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = module.s3.bucket_id
}

output "ec2_public_ip" {
  description = "Elastic IP of the backend EC2 instance"
  value       = module.ec2.elastic_ip
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.db_port
}

