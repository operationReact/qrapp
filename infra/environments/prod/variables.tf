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

