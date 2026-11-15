# ============================================================
# Module: acm
# Creates an ACM SSL certificate in us-east-1 (required for
# CloudFront) and auto-validates it via Route53 DNS records.
# ============================================================

# The certificate MUST live in us-east-1 for CloudFront.
# Caller must pass: providers = { aws.us_east_1 = aws.us_east_1 }
# Create certificate only when an existing_certificate_arn is NOT provided.
resource "aws_acm_certificate" "this" {
  count    = var.existing_certificate_arn == "" ? 1 : 0
  provider = aws.us_east_1

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
  count        = var.existing_certificate_arn == "" ? 1 : 0
  name         = var.hosted_zone_name
  private_zone = false
}

# ── Write DNS validation CNAME records to Route53 ────────────────────────────
# NOTE: This uses for_each with domain_validation_options which are only known after
# the certificate is created. The GitHub Actions workflow uses a two-phase apply:
# 1. terraform apply -target=module.acm.aws_acm_certificate.this
# 2. terraform apply -target=module.acm.aws_route53_record.validation
# This ensures domain_validation_options are available before creating these records.
# Stable for_each keys, known before apply. Removes the need for unsafe
# -target= apply stages, even though certificate DNS values are computed.
resource "aws_route53_record" "validation" {
  for_each = var.existing_certificate_arn == "" ? toset(distinct(concat(
    [var.domain_name],
    var.subject_alternative_names
  ))) : toset([])

  allow_overwrite = true
  name = one([
    for dvo in aws_acm_certificate.this[0].domain_validation_options :
    dvo.resource_record_name if dvo.domain_name == each.key
  ])
  records = [one([
    for dvo in aws_acm_certificate.this[0].domain_validation_options :
    dvo.resource_record_value if dvo.domain_name == each.key
  ])]
  ttl = 60
  type = "CNAME"
  zone_id = data.aws_route53_zone.this[0].zone_id
}

# ── Wait for certificate to become ISSUED ────────────────────────────────────
resource "aws_acm_certificate_validation" "this" {
  count    = var.existing_certificate_arn == "" ? 1 : 0
  provider = aws.us_east_1

  certificate_arn = aws_acm_certificate.this[0].arn

  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

# If an existing certificate ARN is provided, the module will not create
# validation records. Use the provided ARN as the module's certificate arn.

