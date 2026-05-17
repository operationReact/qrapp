variable "environment" {
  type = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs that may SSH to EC2. Lock this down to your IP in prod."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}


