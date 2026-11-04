# Production CloudFront WAF with managed baseline and inexpensive IP rate limiting.
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.8"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

variable "environment" { type = string }
variable "rate_limit_requests" {
  description = "Five-minute per-IP rate limit; allow for corporate NAT sharing"
  type        = number
  default     = 30000
}

resource "aws_wafv2_web_acl" "this" {
  provider    = aws.us_east_1
  name        = "broandbro-${var.environment}-cloudfront"
  description = "Basic CloudFront protection for broandbro"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "IpRateLimit"
    priority = 0
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.rate_limit_requests
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "broandbro-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedCommonRules"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "broandbro-common-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "broandbro-${var.environment}-acl"
    sampled_requests_enabled   = true
  }
  tags = { Environment = var.environment, ManagedBy = "Terraform" }
}

output "web_acl_arn" { value = aws_wafv2_web_acl.this.arn }
