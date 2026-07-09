# =============================================================================
# Module: cloudwatch
# Sets up CloudWatch log groups, metric alarms, and agent config via SSM.
# =============================================================================

# ── Log Groups ────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "app" {
  name              = "/broandbro/${var.environment}/app"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "broandbro-${var.environment}-app-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "nginx" {
  name              = "/broandbro/${var.environment}/nginx"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "broandbro-${var.environment}-nginx-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "system" {
  name              = "/broandbro/${var.environment}/system"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "broandbro-${var.environment}-system-logs"
    Environment = var.environment
  }
}

# ── CloudWatch Agent Config stored in SSM ────────────────────────────────────
# The EC2 instance reads this on boot (or via `amazon-cloudwatch-agent-ctl`)

resource "aws_ssm_parameter" "cw_agent_config" {
  name        = "/broandbro/${var.environment}/cloudwatch-agent-config"
  description = "CloudWatch Agent configuration for ${var.environment}"
  type        = "String"

  value = jsonencode({
    agent = {
      metrics_collection_interval = 60
      run_as_user                 = "root"
    }
    logs = {
      logs_collected = {
        files = {
          collect_list = [
            {
              file_path        = "/opt/broandbro/logs/app.log"
              log_group_name   = aws_cloudwatch_log_group.app.name
              log_stream_name  = "{instance_id}"
              timezone         = "UTC"
            },
            {
              file_path        = "/var/log/nginx/access.log"
              log_group_name   = aws_cloudwatch_log_group.nginx.name
              log_stream_name  = "{instance_id}-access"
              timezone         = "UTC"
            },
            {
              file_path        = "/var/log/nginx/error.log"
              log_group_name   = aws_cloudwatch_log_group.nginx.name
              log_stream_name  = "{instance_id}-error"
              timezone         = "UTC"
            }
          ]
        }
      }
    }
    metrics = {
      namespace = "BroanBro/${var.environment}"
      metrics_collected = {
        cpu = {
          measurement                 = ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"]
          metrics_collection_interval = 60
          totalcpu                    = true
        }
        disk = {
          measurement                 = ["used_percent", "inodes_free"]
          metrics_collection_interval = 60
          resources                   = ["/"]
        }
        mem = {
          measurement                 = ["mem_used_percent"]
          metrics_collection_interval = 60
        }
      }
    }
  })

  tags = {
    Name        = "broandbro-${var.environment}-cw-agent-config"
    Environment = var.environment
  }
}

# ── SNS Topic for Alarms ──────────────────────────────────────────────────────

resource "aws_sns_topic" "alarms" {
  name = "broandbro-${var.environment}-alarms"

  tags = {
    Name        = "broandbro-${var.environment}-alarms"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ── EC2 Metric Alarms ─────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "broandbro-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU utilization > 80% for 4 min"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = "broandbro-${var.environment}-status-check-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 status check failed"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Environment = var.environment
  }
}

# ── RDS Alarms ────────────────────────────────────────────────────────────────



# ── CloudWatch Dashboard ──────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "broandbro-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EC2 CPU Utilization"
          metrics = [["AWS/EC2", "CPUUtilization", "InstanceId", var.ec2_instance_id]]
          period  = 60
          stat    = "Average"
          region  = var.aws_region
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title = "Custom Metrics (Memory & Disk)"
          metrics = [
            ["BroanBro/${var.environment}", "mem_used_percent"],
            ["BroanBro/${var.environment}", "disk_used_percent", "path", "/", "device", "nvme0n1p1", "fstype", "xfs"]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          view   = "timeSeries"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          title   = "Application Logs (last 20 lines)"
          query   = "SOURCE '${aws_cloudwatch_log_group.app.name}' | fields @timestamp, @message | sort @timestamp desc | limit 20"
          region  = var.aws_region
          view    = "table"
        }
      }
    ]
  })
}

