variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "domain_name" {
  type    = string
  default = "broandbro.in"
}

variable "frontend_bucket_name" {
  type    = string
  default = "broandbro-develop-ui"
}

variable "ec2_instance_type" {
  type    = string
  default = "t4g.micro"
}
# ec2_public_key removed – Terraform auto-generates the key pair

variable "ssh_allowed_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"] # Open for dev – tighten in prod
}


variable "rds_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "broandbro_dev"
}

variable "db_username" {
  type    = string
  default = "broandbro"
}
# db_password removed – Terraform auto-generates it via random_password

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications (optional)"
  type        = string
  default     = ""
}

variable "media_bucket_name" {
  description = "Name of the shared S3 bucket for AI-generated menu item images. Created once by bootstrap/bootstrap.tf and referenced here."
  type        = string
  default     = "broandbro-menu-images-dev"
}
