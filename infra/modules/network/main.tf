# Minimal production-grade VPC: 1 public EC2 subnet, 2 private RDS subnets.
# No NAT Gateway (avoids recurring NAT costs). RDS has no public route.
variable "environment" { type = string }
variable "vpc_cidr" { type = string }

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name        = "broandbro-${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "public" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "broandbro-${var.environment}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags = {
    Name        = "broandbro-${var.environment}-public"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 10 + count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = {
    Name        = "broandbro-${var.environment}-private-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.public.id
  }
  tags = { Name = "broandbro-${var.environment}-public-route-table" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

output "vpc_id" { value = aws_vpc.this.id }
output "public_subnet_id" { value = aws_subnet.public.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
