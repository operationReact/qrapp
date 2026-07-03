variable "domain_name" {
  description = "Root domain name"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID for alias records"
  type        = string
}

variable "ec2_elastic_ip" {
  description = "Elastic IP of the backend EC2 instance"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain for the API (e.g. api or dev-api)"
  type        = string
  default     = "api"
}

variable "create_dev_records" {
  description = "Whether to create dev.* and dev-api.* DNS records"
  type        = bool
  default     = false
}

variable "hosted_zone_name" {
  description = "The name of the hosted zone"
  type        = string
}

variable "apex_domain" {
  description = "The apex domain"
  type        = string
}

variable "create_www_record" {
  description = "Whether to create a www record"
  type        = bool
  default     = true
}
