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
  default = "broandbro-dev-ui"
}

variable "ec2_instance_type" {
  type    = string
  default = "t4g.micro"
}

variable "ec2_public_key" {
  description = "SSH public key for EC2 access (injected via GitHub Actions secret)"
  type        = string
}

variable "ssh_allowed_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]  # Open for dev – tighten in prod
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

variable "db_password" {
  type      = string
  sensitive = true
}

