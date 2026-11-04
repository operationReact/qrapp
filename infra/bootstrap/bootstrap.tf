# New-account bootstrap. Run with short-lived AWS SSO credentials in the TARGET account.
# This stack deliberately keeps local state: protect its terraform.tfstate and back it up securely.
terraform {
  required_version = ">= 1.11.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.8"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "expected_account_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "Supply a 12-digit new AWS account ID."
  }
}

variable "github_repository" {
  type    = string
  default = "operationReact/qrapp"
}

variable "domain_name" {
  type    = string
  default = "broandbro.in"
}

variable "create_hosted_zone" {
  type        = bool
  default     = true
  description = "Creates the replacement Route 53 public zone; registrar delegation is a separate cutover."
}

provider "aws" {
  region = var.aws_region
  allowed_account_ids = [var.expected_account_id]
}

data "aws_caller_identity" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  state_bucket = "broandbro-tfstate-${local.account_id}-${var.aws_region}"
  environments = toset(["dev", "prod"])
  deploy_roles = {
    for p in setproduct(["dev", "prod"], ["terraform", "frontend", "backend"]) :
    "${p[0]}-${p[1]}" => { environment = p[0], purpose = p[1] }
  }
}

check "expected_account" {
  assert {
    condition     = local.account_id == var.expected_account_id
    error_message = "Authenticated AWS account does not match expected_account_id."
  }
}

resource "aws_s3_bucket" "tfstate" {
  bucket = local.state_bucket
  lifecycle {
    prevent_destroy = true
  }
  tags = { Project = "broandbro", Purpose = "terraform-state" }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid = "EnforceTLS", Effect = "Deny", Principal = "*", Action = "s3:*"
      Resource = [aws_s3_bucket.tfstate.arn, "${aws_s3_bucket.tfstate.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_route53_zone" "new_account" {
  count = var.create_hosted_zone ? 1 : 0
  name  = var.domain_name
  lifecycle { prevent_destroy = true }
  tags = { Project = "broandbro", Purpose = "replacement-public-zone" }
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github" {
  for_each = local.deploy_roles
  name     = "broandbro-${each.value.environment}-${each.value.purpose}-github"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${each.value.environment}"
        }
      }
    }]
  })
  tags = { Project = "broandbro", Environment = each.value.environment, Purpose = each.value.purpose }
}

# Provisioning role: service-scoped provisioning actions, never AdministratorAccess.
# IAM creation/pass role is separately constrained to broandbro-* identities.
# Review CloudTrail, IAM Access Analyzer, and org SCPs before production.
resource "aws_iam_role_policy" "terraform" {
  for_each = local.environments
  role     = aws_iam_role.github["${each.key}-terraform"].id
  name     = "broandbro-${each.key}-terraform-provision"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "TerraformApplicationServices", Effect = "Allow"
        Action = [
          "acm:*", "cloudfront:*", "cloudwatch:*", "ec2:*", "logs:*",
          "rds:*", "route53:*", "s3:*", "sns:*", "ssm:*", "secretsmanager:DescribeSecret",
          "scheduler:*", "wafv2:*", "kms:DescribeKey", "kms:ListAliases",
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      },
      {
        Sid = "ManageOnlyProjectIAM", Effect = "Allow"
        Action = [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:TagRole",
          "iam:UntagRole", "iam:PutRolePolicy", "iam:GetRolePolicy",
          "iam:DeleteRolePolicy", "iam:AttachRolePolicy", "iam:DetachRolePolicy",
          "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile",
          "iam:GetInstanceProfile", "iam:AddRoleToInstanceProfile",
          "iam:RemoveRoleFromInstanceProfile", "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::${local.account_id}:role/broandbro-${each.key}-*",
          "arn:aws:iam::${local.account_id}:instance-profile/broandbro-${each.key}-*"
        ]
      },
      {
        Sid = "ReadAWSManagedPolicies", Effect = "Allow"
        Action = ["iam:GetPolicy", "iam:GetPolicyVersion", "iam:ListAttachedRolePolicies"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "frontend" {
  for_each = local.environments
  role     = aws_iam_role.github["${each.key}-frontend"].id
  name     = "broandbro-${each.key}-frontend-deploy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "ListUIBucket", Effect = "Allow", Action = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::broandbro-${each.key}-ui-${local.account_id}"
      },
      {
        Sid = "UpdateUIAssets", Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::broandbro-${each.key}-ui-${local.account_id}/*"
      },
      {
        Sid = "InvalidateCDN", Effect = "Allow", Action = ["cloudfront:CreateInvalidation"]
        Resource = "*"
      },
      {
        Sid = "DistributionParameter", Effect = "Allow", Action = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/broandbro/${each.key}/cf-distribution-id"
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend" {
  for_each = local.environments
  role     = aws_iam_role.github["${each.key}-backend"].id
  name     = "broandbro-${each.key}-backend-deploy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "ReadArtifactBucketNameOnly", Effect = "Allow"
        Action = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/broandbro/backend/${each.key}/aws/s3/artifactBucketName"
      },
      {
        Sid = "WriteArtifact", Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "arn:aws:s3:::broandbro-${each.key}-artifacts-${local.account_id}/deploy/${each.key}/*"
      },
      {
        Sid = "RunCommandsOnlyOnOwnEnvironment", Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = "arn:aws:ec2:${var.aws_region}:${local.account_id}:instance/*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = each.key
          }
        }
      },
      {
        Sid = "UseApprovedSSMDocument", Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript"
      },
      {
        Sid = "InspectCommands", Effect = "Allow"
        Action = ["ssm:GetCommandInvocation", "ec2:DescribeInstances"]
        Resource = "*"
      }
    ]
  })
}

output "account_id" { value = local.account_id }
output "state_bucket" { value = aws_s3_bucket.tfstate.id }
output "github_role_arns" {
  value = { for key, role in aws_iam_role.github : key => role.arn }
}
output "new_zone_nameservers" {
  value = var.create_hosted_zone ? aws_route53_zone.new_account[0].name_servers : []
}

output "new_zone_id" {
  value = var.create_hosted_zone ? aws_route53_zone.new_account[0].zone_id : ""
}
