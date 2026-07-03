# ============================================================
# Module: acm
# Creates an ACM SSL certificate in us-east-1 (required for
# CloudFront) and auto-validates it via Route53 DNS records.
# ============================================================

# The certificate MUST live in us-east-1 for CloudFront.
# Caller must pass: providers = { aws.us_east_1 = aws.us_east_1 }
resource "aws_acm_certificate" "this" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.subject_alternative_names

  # Always create new cert before destroying old one to avoid downtime
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "broandbro-${var.environment}"
    Environment = var.environment
  }
}

# ── Fetch the Route53 hosted zone so we can write CNAME records ───────────────
data "aws_route53_zone" "this" {
  name         = var.hosted_zone_name
  private_zone = false
}

# ── Write DNS validation CNAME records to Route53 ────────────────────────────
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.this.zone_id
}

# ── Wait for certificate to become ISSUED ────────────────────────────────────
resource "aws_acm_certificate_validation" "this" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
