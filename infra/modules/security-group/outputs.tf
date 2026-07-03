output "ec2_sg_id" {
  value       = aws_security_group.ec2.id
  description = "Security group ID for EC2 instances"
}

output "rds_sg_id" {
  value       = aws_security_group.rds.id
  description = "Security group ID for RDS"
}

output "vpc_id" {
  value       = data.aws_vpc.default.id
  description = "VPC ID used"
}
