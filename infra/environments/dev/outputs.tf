output "cloudfront_distribution_id" {
  value       = module.cloudfront.distribution_id
  description = "CloudFront ID – used by frontend-deploy-dev workflow"
}

output "cloudfront_url" {
  value       = "https://dev.broandbro.in"
  description = "Dev frontend URL"
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
  description = "RDS endpoint; the application reads the complete JDBC URL from the environment-scoped SSM database parameters"
}

output "cloudwatch_dashboard_url" {
  value       = module.cloudwatch.dashboard_url
  description = "CloudWatch dashboard URL for dev monitoring"
}

output "alarm_sns_topic_arn" {
  value       = module.cloudwatch.alarm_sns_topic_arn
  description = "SNS topic ARN for CloudWatch alarms"
}

output "media_bucket_name" {
  value       = module.media.bucket_id
  description = "Shared S3 bucket for AI-generated menu item images (set as AWS_S3_BUCKET_NAME env var)"
}

output "media_bucket_arn" {
  value       = module.media.bucket_arn
  description = "ARN of the shared media S3 bucket"
}

output "media_bucket_regional_domain" {
  value       = module.media.regional_domain_name
  description = "Regional domain – base URL for public image access"
}

output "location_bucket_name" { value = module.location_images.bucket_id }
output "artifact_bucket_name" { value = module.artifacts.bucket_id }
