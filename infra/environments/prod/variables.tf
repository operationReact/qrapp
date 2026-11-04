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
  default = ""
}

variable "ec2_instance_type" {
  type    = string
  default = "t4g.small"
}
# ec2_public_key removed – Terraform auto-generates the key pair

variable "ssh_allowed_cidrs" {
  description = "Lock this down to your office IP in prod!"
  type        = list(string)
  default     = [] # SSM only; do not expose SSH
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
  default     = ""
}

variable "existing_certificate_arn" {
  description = "Optional: ARN of an existing ACM certificate in us-east-1. If provided, skips certificate creation."
  type        = string
  default     = ""
}

variable "enable_waf" {
  type        = bool
  description = "Enable account-owned CloudFront WAF (additional monthly AWS WAF charges)."
  default     = true
}

# EC2 and RDS are the only scheduled services. S3, CloudFront, EBS and EIPs
# remain allocated/billable when instances are stopped.
variable "enable_cost_schedule" {
  type        = bool
  description = "Schedule weekday EC2/RDS starts/stops; FALSE by default in production."
  default     = false
}

variable "schedule_timezone" {
  type    = string
  default = "Asia/Kolkata"
}

# Migration preview hostnames avoid conflicting with the old CloudFront aliases.
# Switch these to final names only during the controlled production cutover.
variable "frontend_hostname" {
  type    = string
  default = "migrate-prod.broandbro.in"
}
variable "api_hostname" {
  type    = string
  default = "migrate-prod-api.broandbro.in"
}

variable "expected_account_id" {
  type        = string
  description = "12-digit target AWS account ID. Terraform refuses an unmatched caller."
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Set expected_account_id to the target 12-digit AWS account ID."
  }
}

# All schedule expressions use schedule_timezone, default Asia/Kolkata.
variable "schedule_rds_start_cron" {
  type    = string
  default = "cron(0 9 ? * MON-FRI *)"
}
variable "schedule_ec2_start_cron" { type = string, default = "cron(30 9 ? * MON-FRI *)" }
variable "schedule_ec2_stop_cron" { type = string, default = "cron(0 20 ? * MON-FRI *)" }
variable "schedule_rds_stop_cron" {
  type    = string
  default = "cron(15 20 ? * MON-FRI *)"
}
