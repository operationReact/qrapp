variable "environment" {
  type = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs that may SSH to EC2. Lock this down to your IP in prod."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "local_dev_cidrs" {
  description = "Your local machine IP(s) allowed to connect to RDS (5432). Use YOUR_IP/32."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

