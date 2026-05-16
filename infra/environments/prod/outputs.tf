output "cloudfront_distribution_id" {
  value       = module.cloudfront.distribution_id
  description = "CloudFront ID – used by frontend-deploy-prod workflow"
}

output "cloudfront_url" {
  value       = "https://broandbro.in"
  description = "Production frontend URL"
}

output "frontend_bucket" {
  value       = module.s3.bucket_id
  description = "S3 bucket for frontend uploads"
}

output "ec2_elastic_ip" {
  value       = module.ec2.elastic_ip
  description = "EC2 Elastic IP – used by backend deploy workflow"
}

output "rds_endpoint" {
  value       = module.rds.db_endpoint
  sensitive   = true
  description = "RDS endpoint for Spring Boot datasource URL"
}

