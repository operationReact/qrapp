# Backend deployment artifacts are private and have short retention.
variable "environment" { type = string }
variable "bucket_name" { type = string }

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name, Environment = var.environment, Purpose = "private-deploy-artifacts" }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    id     = "remove-deploy-artifacts"
    status = "Enabled"
    filter { prefix = "deploy/" }
    expiration { days = 3 }
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}

output "bucket_id" { value = aws_s3_bucket.this.id }
output "bucket_arn" { value = aws_s3_bucket.this.arn }
