# Public media is limited to explicit image prefixes. Never put deploy artifacts here.
variable "environment" { type = string }
variable "bucket_name" { type = string }
variable "public_prefixes" {
  type    = list(string)
  default = ["menu-items", "locations", "products", "categories", "campaigns", "hall-of-happiness"]
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  lifecycle { prevent_destroy = true }
  tags = { Name = var.bucket_name, Environment = var.environment, Purpose = "public-media" }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    id     = "noncurrent-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 30 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

resource "aws_s3_bucket_cors_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_policy" "this" {
  bucket     = aws_s3_bucket.this.id
  depends_on = [aws_s3_bucket_public_access_block.this]
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "PublicReadImagesOnly", Effect = "Allow", Principal = "*"
        Action   = "s3:GetObject"
        Resource = [for p in var.public_prefixes : "${aws_s3_bucket.this.arn}/${p}/*"]
      },
      {
        Sid = "DenyInsecureTransport", Effect = "Deny", Principal = "*"
        Action   = "s3:*"
        Resource = [aws_s3_bucket.this.arn, "${aws_s3_bucket.this.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      }
    ]
  })
}

output "bucket_id" { value = aws_s3_bucket.this.id }
output "bucket_arn" { value = aws_s3_bucket.this.arn }
output "regional_domain_name" { value = aws_s3_bucket.this.bucket_regional_domain_name }
