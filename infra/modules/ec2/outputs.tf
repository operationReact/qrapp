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

output "ssm_ssh_key_path" {
  value       = aws_ssm_parameter.ssh_private_key.name
  description = "SSM path where the SSH private key is stored – used by deploy workflows"
}
