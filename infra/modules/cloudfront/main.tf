# ============================================================
# Module: cloudfront
# CDN distribution for the React/Vite SPA.
# – HTTPS only
# – SPA routing (403/404 → index.html)
# – Compression enabled
# – Separate cache for /assets/* (long TTL) vs index.html (no TTL)
# ============================================================

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "broandbro-${var.environment}-frontend"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = var.domain_aliases
  web_acl_id          = var.web_acl_id != "" ? var.web_acl_id : null

  # ── S3 origin via OAC ──────────────────────────────────────────────────────
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "S3-${var.s3_bucket_id}"
    origin_access_control_id = var.s3_oac_id
  }

  # ── Default cache behavior (catches everything) ────────────────────────────
  default_cache_behavior {
    target_origin_id       = "S3-${var.s3_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    # AWS Managed: CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    # AWS Managed: CORS-S3Origin
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"

    # AWS Managed: SecurityHeadersPolicy (adds HSTS, X-Frame-Options etc.)
    response_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03"
  }

  # ── /assets/* – long cache (Vite hashes these filenames on every build) ─────
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "S3-${var.s3_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    # AWS Managed: CachingOptimized (1 year TTL)
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # ── SPA routing: S3 returns 403/404 for unknown routes ────────────────────
  # Return index.html so React Router can handle the path client-side.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # ── TLS certificate ────────────────────────────────────────────────────────
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name        = "broandbro-${var.environment}-cf"
    Environment = var.environment
  }

  # AWS Free-plan distributions reject any update that includes price_class.
  # Pricing is managed by the CloudFront account plan, not this distribution.
  lifecycle {
    ignore_changes = [price_class]
  }
}

# ── Store distribution ID in SSM so the deploy workflow can read it ──────────
resource "aws_ssm_parameter" "cf_distribution_id" {
  name        = "/broandbro/${var.environment}/cf-distribution-id"
  description = "CloudFront distribution ID for ${var.environment} – used by frontend deploy workflow"
  type        = "String"
  value       = aws_cloudfront_distribution.this.id

  tags = {
    Name        = "broandbro-${var.environment}-cf-distribution-id"
    Environment = var.environment
  }
}
