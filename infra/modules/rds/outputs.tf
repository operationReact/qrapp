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

output "ssm_db_password_path" {
  value       = aws_ssm_parameter.db_password.name
  description = "SSM path where the DB password is stored – used by the Spring Boot app"
}
