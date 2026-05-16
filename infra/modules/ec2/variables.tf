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

variable "ec2_public_key" {
  description = "SSH public key material"
  type        = string
}
