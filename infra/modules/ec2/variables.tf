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
  description = "ARN of the shared S3 media bucket (AI-generated images). When set, an IAM policy is attached to the EC2 role allowing PutObject/GetObject/DeleteObject on menu-items/*."
  type        = string
  default     = ""
}

