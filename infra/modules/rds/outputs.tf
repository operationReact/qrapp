output "db_endpoint" {
  value       = aws_db_instance.this.endpoint
  sensitive   = true
  description = "RDS endpoint (host:port)"
}

output "db_port" {
  value       = aws_db_instance.this.port
  description = "RDS port"
}

output "db_name" {
  value       = aws_db_instance.this.db_name
  description = "Database name"
}

output "db_instance_id" {
  value       = aws_db_instance.this.identifier
  description = "RDS instance identifier"
}

output "ssm_db_secret_arn_path" {
  value       = aws_ssm_parameter.db_secret_arn.name
  description = "SSM path storing the automatically generated RDS master secret ARN"
}

output "db_secret_arn" {
  description = "RDS-managed secret ARN (not the credential value)"
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}
