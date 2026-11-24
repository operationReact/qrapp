# DNS destination preparation only. These records are written to the NEW AWS account
# public Route53 zone but have no external effect until the registrar delegates it.
# Keep existing registrar nameservers unchanged until application, TLS, email and
# all service DNS records have been separately verified.
#
# Publicly observed on 2026-11-24 from the currently authoritative zone:
#  MX 5 mx1.hostinger.com; 10 mx2.hostinger.com
#  SPF "v=spf1 include:_spf.mail.hostinger.com ~all"
#  DMARC "v=DMARC1; p=none"
#
# This is NOT an exhaustive DNS export. Additional DKIM, verification, service,
# wildcard, or delegated records may exist: check authoritative zone export
# before changing nameservers.

data "aws_route53_zone" "cutover_destination" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "cutover_apex_frontend" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [module.ec2.elastic_ip]
}

resource "aws_route53_record" "cutover_www_frontend" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [module.ec2.elastic_ip]
}

resource "aws_route53_record" "cutover_api" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [module.ec2.elastic_ip]
}

resource "aws_route53_record" "cutover_email_mx" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 1800
  records = ["5 mx1.hostinger.com", "10 mx2.hostinger.com"]
}

resource "aws_route53_record" "cutover_email_spf" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 1800
  records = ["v=spf1 include:_spf.mail.hostinger.com ~all"]
}

resource "aws_route53_record" "cutover_email_dmarc" {
  zone_id = data.aws_route53_zone.cutover_destination.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=DMARC1; p=none"]
}
