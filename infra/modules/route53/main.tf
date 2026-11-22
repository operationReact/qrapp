# ============================================================
# Module: route53
# DNS records for broandbro.in
# ============================================================

data "aws_route53_zone" "this" {
  name         = var.hosted_zone_name
  private_zone = false
}

# ── Frontend: apex + www → CloudFront ─────────────────────────────────────────
resource "aws_route53_record" "apex" {
  count = var.frontend_direct_to_ec2 ? 0 : 1
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.apex_domain
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  count   = var.create_www_record && !var.frontend_direct_to_ec2 ? 1 : 0
  zone_id = data.aws_route53_zone.this.zone_id
  name    = "www.${var.apex_domain}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# ── Backend: api subdomain → EC2 Elastic IP ──────────────────────────────────
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.api_subdomain
  type    = "A"
  ttl     = 300
  records = [var.ec2_elastic_ip]
}

# Preview frontend without CloudFront: EC2 serves the static SPA via Nginx.
resource "aws_route53_record" "frontend_ec2" {
  count   = var.frontend_direct_to_ec2 ? 1 : 0
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.apex_domain
  type    = "A"
  ttl     = 300
  records = [var.ec2_elastic_ip]
}
