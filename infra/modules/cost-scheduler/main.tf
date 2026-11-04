# Optional EC2/RDS start/stop automation.
# EventBridge Scheduler runs in Asia/Kolkata with separate start/stop ordering.
variable "environment" { type = string }
variable "aws_region" { type = string }
variable "timezone" {
  type    = string
  default = "Asia/Kolkata"
}
variable "ec2_instance_id" { type = string }
variable "rds_instance_id" { type = string }
variable "rds_start_cron" {
  type    = string
  default = "cron(0 9 ? * MON-FRI *)"
}
variable "ec2_start_cron" {
  type    = string
  default = "cron(30 9 ? * MON-FRI *)"
}
variable "ec2_stop_cron" {
  type    = string
  default = "cron(0 20 ? * MON-FRI *)"
}
variable "rds_stop_cron" {
  type    = string
  default = "cron(15 20 ? * MON-FRI *)"
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "scheduler" {
  name = "broandbro-${var.environment}-cost-scheduler"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  name = "broandbro-${var.environment}-start-stop-only"
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "TargetInstanceOnly", Effect = "Allow"
        Action = ["ec2:StartInstances", "ec2:StopInstances"]
        Resource = "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/${var.ec2_instance_id}"
      },
      {
        Sid = "TargetDatabaseOnly", Effect = "Allow"
        Action = ["rds:StartDBInstance", "rds:StopDBInstance"]
        Resource = "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:db:${var.rds_instance_id}"
      }
    ]
  })
}

locals {
  schedules = {
    rds-start = {
      expression = var.rds_start_cron
      arn        = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
      input      = { DbInstanceIdentifier = var.rds_instance_id }
    }
    ec2-start = {
      expression = var.ec2_start_cron
      arn        = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
      input      = { InstanceIds = [var.ec2_instance_id] }
    }
    ec2-stop = {
      expression = var.ec2_stop_cron
      arn        = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
      input      = { InstanceIds = [var.ec2_instance_id] }
    }
    rds-stop = {
      expression = var.rds_stop_cron
      arn        = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
      input      = { DbInstanceIdentifier = var.rds_instance_id }
    }
  }
}

resource "aws_scheduler_schedule" "this" {
  # Ensure the execution role policy exists before the schedule is enabled.
  depends_on = [aws_iam_role_policy.scheduler]
  for_each                     = local.schedules
  name                         = "broandbro-${var.environment}-${each.key}"
  schedule_expression          = each.value.expression
  schedule_expression_timezone = var.timezone
  state                        = "ENABLED"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = each.value.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode(each.value.input)
    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }
  }
}

output "schedule_names" { value = [for item in aws_scheduler_schedule.this : item.name] }
