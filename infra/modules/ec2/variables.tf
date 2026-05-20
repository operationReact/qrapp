variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (e.g. t4g.micro, t4g.small)"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID to attach to the instance"
  type        = string
}

variable "media_bucket_arn" {
  description = "ARN of the shared S3 media bucket (AI-generated images)."
  type        = string
  default     = ""
}

variable "create_media_s3_policy" {
  description = "Set to true to attach an S3 IAM policy for the media bucket to the EC2 role. Must be true when media_bucket_arn is provided."
  type        = bool
  default     = false
}

