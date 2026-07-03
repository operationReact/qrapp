variable "environment" {
  description = "Deployment environment (dev, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "ec2_instance_id" {
  description = "EC2 instance ID to attach alarms to"
  type        = string
}

variable "rds_identifier" {
  description = "RDS DB instance identifier (leave empty to skip RDS alarms)"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alarm_email" {
  description = "Email address to receive SNS alarm notifications (leave empty to skip)"
  type        = string
  default     = ""
}

