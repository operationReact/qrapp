variable "bucket_name" {
  description = "Globally unique S3 bucket name"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev | prod)"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN (needed for OAC bucket policy)"
  type        = string
}
