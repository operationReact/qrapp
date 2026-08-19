#!/bin/bash
# GitHub Actions - Run this in your CI/CD after backend deployment
# Automatically setup Nginx reverse proxy on EC2

INSTANCE_ID="$1"
DOMAIN="$2"
BACKEND_PORT="${3:-8080}"
AWS_REGION="${4:-us-east-1}"

if [ -z "$INSTANCE_ID" ] || [ -z "$DOMAIN" ]; then
  echo "❌ Usage: $0 <instance-id> <domain> [backend-port] [aws-region]"
  echo "Example: $0 i-0f2ba63193349f4af dev-api.broandbro.in 8080 us-east-1"
  exit 1
fi

echo "🚀 Setting up Nginx reverse proxy via SSM"
echo "Instance: $INSTANCE_ID"
echo "Domain: $DOMAIN"
echo "Backend Port: $BACKEND_PORT"

# Create setup command
SETUP_CMD="curl -fsSL https://raw.githubusercontent.com/operationReact/qrapp/dev/infra/ec2-reverse-proxy-setup.sh | sudo bash -s -- $DOMAIN $BACKEND_PORT admin@broandbro.in"

# Send command via SSM
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"$SETUP_CMD\"]" \
  --timeout-seconds 300 \
  --region "$AWS_REGION" \
  --output text \
  --query 'Command.CommandId')

echo "SSM Command ID: $COMMAND_ID"

# Poll for completion
echo "⏳ Waiting for setup to complete..."
for i in {1..60}; do
  sleep 5

  INVOCATION=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$AWS_REGION" 2>/dev/null || echo '{}')

  STATUS=$(echo "$INVOCATION" | python3 -c \
    "import sys,json; print(json.load(sys.stdin).get('Status','Pending'))" 2>/dev/null || echo "Pending")

  echo "  [$i/60] $STATUS"

  if [ "$STATUS" = "Success" ]; then
    echo ""
    echo "✅ Nginx reverse proxy setup successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update frontend/.env.dev to: VITE_API_URL=https://$DOMAIN"
    echo "2. Rebuild frontend: npm run build:dev"
    echo "3. Deploy frontend"
    exit 0
  elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ]; then
    echo ""
    echo "❌ Setup failed with status: $STATUS"
    echo ""
    echo "Output:"
    echo "$INVOCATION" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d.get('StandardOutputContent','')); print(d.get('StandardErrorContent',''))" 2>/dev/null || echo "Check AWS Systems Manager for details"
    exit 1
  fi
done

echo "❌ Timed out waiting for setup"
exit 1

