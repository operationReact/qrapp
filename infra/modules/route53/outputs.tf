output "zone_id" {
  value       = data.aws_route53_zone.this.zone_id
  description = "Route53 hosted zone ID"
}

output "nameservers" {
  value       = data.aws_route53_zone.this.name_servers
  description = "Nameservers for the hosted zone"
}
