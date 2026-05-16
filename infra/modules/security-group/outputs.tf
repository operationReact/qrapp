output "ec2_sg_id" { value = aws_security_group.ec2.id }

output "rds_sg_id" { value = aws_security_group.rds.id }

output "vpc_id"    { value = data.aws_vpc.default.id }
