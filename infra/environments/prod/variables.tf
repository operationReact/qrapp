variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "domain_name" {
  type    = string
  default = "broandbro.in"
}

variable "frontend_bucket_name" {
  type    = string
  default = "broandbro-prod-ui"
}

variable "ec2_instance_type" {
  type    = string
  default = "t4g.small"
}
# ec2_public_key removed – Terraform auto-generates the key pair

variable "ssh_allowed_cidrs" {
  description = "Lock this down to your office IP in prod!"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "db_name" {
  type    = string
  default = "broandbro"
}

variable "db_username" {
  type    = string
  default = "broandbro"
}
# db_password removed – Terraform auto-generates it via random_password

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications (recommended for prod)"
  type        = string
  default     = ""
}

variable "media_bucket_name" {
  description = "Name of the production S3 bucket for AI-generated menu item images."
  type        = string
  default     = "broandbro-prod-root-bucket"
}

variable "existing_certificate_arn" {
  description = "Optional: ARN of an existing ACM certificate in us-east-1. If provided, skips certificate creation."
  type        = string
  default     = ""
}

variable "cloudfront_web_acl_id" {
  description = "Existing WAF web ACL ARN attached to the production CloudFront distribution"
  type        = string
  default     = "arn:aws:wafv2:us-east-1:816344830716:global/webacl/CreatedByCloudFront-86c2086a/ee229c0f-bb44-401b-a40a-7ce132c5a96b"
}
