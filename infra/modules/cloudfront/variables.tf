variable "environment" {
  type = string
}

variable "s3_bucket_id" {
  type = string
}

variable "s3_bucket_regional_domain_name" {
  type = string
}

variable "s3_oac_id" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}

variable "domain_aliases" {
  type    = list(string)
  default = []
}

variable "price_class" {
  type    = string
  default = "PriceClass_200" # US + Europe + Asia – good for India
}
