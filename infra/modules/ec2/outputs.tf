output "instance_id"  { value = aws_instance.this.id }

output "elastic_ip"   { value = aws_eip.this.public_ip }

output "instance_arn" { value = aws_instance.this.arn }
