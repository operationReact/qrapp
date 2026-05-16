output "instance_id" {
  value       = aws_instance.this.id
  description = "EC2 instance ID"
}

output "elastic_ip" {
  value       = aws_eip.this.public_ip
  description = "Elastic IP address of the backend"
}

output "instance_arn" {
  value       = aws_instance.this.arn
  description = "EC2 instance ARN"
}
