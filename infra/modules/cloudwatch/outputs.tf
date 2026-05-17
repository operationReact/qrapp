output "app_log_group_name" {
  description = "CloudWatch log group name for the Spring Boot app"
  value       = aws_cloudwatch_log_group.app.name
}

output "nginx_log_group_name" {
  description = "CloudWatch log group name for Nginx"
  value       = aws_cloudwatch_log_group.nginx.name
}

output "alarm_sns_topic_arn" {
  description = "SNS topic ARN used for CloudWatch alarms"
  value       = aws_sns_topic.alarms.arn
}

output "dashboard_url" {
  description = "Direct URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

