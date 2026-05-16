# =============================================================================
# broandbro Infrastructure – Complete DevOps Guide
# Terraform + GitHub Actions on AWS (ap-south-1)
# =============================================================================

## Architecture Overview

```
Internet
    │
    ├── broandbro.in / www.broandbro.in
    │       └── Route53 → CloudFront → S3 (React/Vite SPA)
    │
    ├── api.broandbro.in  (prod)
    │   dev-api.broandbro.in  (dev)
    │       └── Route53 → EC2 Elastic IP → Nginx → Spring Boot :8080
    │
    └── (DB is internal only)
            EC2 Security Group → RDS PostgreSQL (no public access)
```

## Repository Structure

```
broandbro/
├── frontend/              ← React + Vite
├── backend/               ← Spring Boot
└── infra/
    ├── bootstrap/         ← Run ONCE: S3 state + DynamoDB + OIDC
    ├── environments/
    │   ├── dev/           ← Dev environment (dev branch)
    │   └── prod/          ← Prod environment (main branch)
    └── modules/
        ├── acm/           ← ACM SSL certificate (us-east-1)
        ├── cloudfront/    ← CloudFront CDN
        ├── ec2/           ← EC2 instance + IAM + Elastic IP
        ├── rds/           ← RDS PostgreSQL
        ├── route53/       ← DNS records
        ├── s3/            ← Frontend bucket + OAC
        └── security-group/ ← EC2 + RDS security groups

.github/workflows/
├── terraform-validate.yml      ← on push/PR to dev|main, infra/**
├── terraform-plan.yml          ← on PR to dev|main, infra/**
├── terraform-apply-dev.yml     ← on push to dev, infra/**
├── terraform-apply-prod.yml    ← on push to main, infra/** (approval required)
├── frontend-deploy-dev.yml     ← on push to dev, frontend/**
├── frontend-deploy-prod.yml    ← on push to main, frontend/** (approval required)
├── backend-deploy-dev.yml      ← on push to dev, backend/**
└── backend-deploy-prod.yml     ← on push to main, backend/** (approval required)
```

## Environment Strategy

| Config | Dev | Prod |
|---|---|---|
| Branch | `dev` | `main` |
| EC2 type | t4g.micro | t4g.small |
| RDS type | db.t4g.micro | db.t4g.small |
| Frontend domain | dev.broandbro.in | broandbro.in |
| API domain | dev-api.broandbro.in | api.broandbro.in |
| S3 bucket | broandbro-dev-ui | broandbro-prod-ui |
| CloudFront pricing | PriceClass_100 | PriceClass_200 |
| Terraform state | env/dev/terraform.tfstate | env/prod/terraform.tfstate |
| Approval required | ❌ | ✅ |

---

## Prerequisites

1. [Terraform >= 1.9](https://developer.hashicorp.com/terraform/install)
2. [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
3. AWS account with admin access
4. Domain `broandbro.in` registered
5. Route53 hosted zone for `broandbro.in` (see Step 2)

---

## Step 1 – Configure AWS CLI

```bash
# Configure your AWS credentials locally
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: ap-south-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## Step 2 – Create Route53 Hosted Zone

If `broandbro.in` doesn't have a hosted zone yet:

```bash
# Create the hosted zone
aws route53 create-hosted-zone \
  --name broandbro.in \
  --caller-reference $(date +%s)

# Get the nameservers
aws route53 list-hosted-zones-by-name \
  --dns-name broandbro.in \
  --query "HostedZones[0].Id" \
  --output text | xargs -I{} \
  aws route53 get-hosted-zone --id {} \
  --query "DelegationSet.NameServers"
```

Then **update your domain registrar** (GoDaddy, Namecheap, etc.) to use the Route53 nameservers.

> ⚠️ DNS propagation takes 24–48 hours. ACM certificate validation won't complete until DNS is propagated.

---

## Step 3 – Bootstrap Terraform Backend (Run ONCE)

This creates the S3 state bucket, DynamoDB lock table, and GitHub OIDC role.

```bash
cd infra/bootstrap

# Edit bootstrap.tf – replace YOUR_GITHUB_ORG with your GitHub username or org
# Example: "repo:myorg/broandbro:*"

terraform init
terraform plan
terraform apply

# Note the outputs – you'll need them:
# github_actions_role_arn = "arn:aws:iam::123456789:role/broandbro-github-actions-role"
```

> ⚠️ **Never run `terraform destroy` on bootstrap.** It would delete your state files.

---

## Step 4 – Generate SSH Key Pairs

```bash
# Dev key pair
ssh-keygen -t ed25519 -C "broandbro-dev" -f ~/.ssh/broandbro_dev
cat ~/.ssh/broandbro_dev.pub   # ← this is DEV_EC2_PUBLIC_KEY

# Prod key pair  
ssh-keygen -t ed25519 -C "broandbro-prod" -f ~/.ssh/broandbro_prod
cat ~/.ssh/broandbro_prod.pub  # ← this is PROD_EC2_PUBLIC_KEY
```

---

## Step 5 – Configure GitHub Secrets

Go to **GitHub → your repo → Settings → Secrets and variables → Actions**

### Repository-level secrets (shared across environments)

| Secret | Value | Where to get it |
|--------|-------|-----------------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT:role/broandbro-github-actions-role` | bootstrap output |

### Environment secrets – Dev (`Settings → Environments → dev`)

| Secret | Value |
|--------|-------|
| `DEV_EC2_PUBLIC_KEY` | Contents of `~/.ssh/broandbro_dev.pub` |
| `DEV_EC2_SSH_PRIVATE_KEY` | Contents of `~/.ssh/broandbro_dev` |
| `DEV_EC2_HOST` | EC2 Elastic IP (available after first terraform apply) |
| `DEV_DB_PASSWORD` | Strong random password (e.g. `openssl rand -base64 32`) |
| `DEV_DB_HOST` | RDS endpoint host (available after first terraform apply) |
| `DEV_DB_NAME` | `broandbro_dev` |
| `DEV_DB_USERNAME` | `broandbro` |
| `DEV_CF_DISTRIBUTION_ID` | CloudFront distribution ID (after first terraform apply) |

### Environment secrets – Prod (`Settings → Environments → prod`)

| Secret | Value |
|--------|-------|
| `PROD_EC2_PUBLIC_KEY` | Contents of `~/.ssh/broandbro_prod.pub` |
| `PROD_EC2_SSH_PRIVATE_KEY` | Contents of `~/.ssh/broandbro_prod` |
| `PROD_EC2_HOST` | EC2 Elastic IP (available after first terraform apply) |
| `PROD_DB_PASSWORD` | Strong random password (different from dev) |
| `PROD_DB_HOST` | RDS endpoint host (available after first terraform apply) |
| `PROD_DB_NAME` | `broandbro` |
| `PROD_DB_USERNAME` | `broandbro` |
| `PROD_CF_DISTRIBUTION_ID` | CloudFront distribution ID (after first terraform apply) |

---

## Step 6 – Configure GitHub Environments

Go to **GitHub → Settings → Environments**

### Create `dev` environment
- No approval required
- Add all `DEV_*` secrets listed above

### Create `prod` environment
- ✅ **Required reviewers**: add yourself or a reviewer
- ✅ Enable "Prevent self-review" for team use
- Add all `PROD_*` secrets listed above

---

## Step 7 – First Terraform Apply (Manual)

Run the first apply manually before GitHub Actions takes over:

```bash
# DEV
cd infra/environments/dev

terraform init
terraform plan \
  -var="db_password=YOUR_DEV_DB_PASSWORD" \
  -var="ec2_public_key=$(cat ~/.ssh/broandbro_dev.pub)"

terraform apply \
  -var="db_password=YOUR_DEV_DB_PASSWORD" \
  -var="ec2_public_key=$(cat ~/.ssh/broandbro_dev.pub)"

# Get outputs to fill GitHub secrets
terraform output ec2_elastic_ip       # → DEV_EC2_HOST
terraform output cloudfront_distribution_id  # → DEV_CF_DISTRIBUTION_ID
terraform output -raw rds_endpoint    # → DEV_DB_HOST (strip the :5432 part)
```

```bash
# PROD
cd infra/environments/prod

terraform init
terraform plan \
  -var="db_password=YOUR_PROD_DB_PASSWORD" \
  -var="ec2_public_key=$(cat ~/.ssh/broandbro_prod.pub)"

terraform apply \
  -var="db_password=YOUR_PROD_DB_PASSWORD" \
  -var="ec2_public_key=$(cat ~/.ssh/broandbro_prod.pub)"

# Get outputs
terraform output ec2_elastic_ip
terraform output cloudfront_distribution_id
terraform output -raw rds_endpoint
```

> After this, fill in the remaining GitHub secrets (EC2_HOST, CF_DISTRIBUTION_ID, DB_HOST).

---

## Step 8 – Push to Start CI/CD

Once all secrets are set:

```bash
# Trigger dev pipeline
git checkout dev
git push origin dev

# Trigger prod pipeline (requires approval)
git checkout main
git merge dev
git push origin main
```

---

## Workflow Decision Logic

```
Push to `dev`
    └─ infra/**  changed? → terraform-validate → terraform-apply-dev
    └─ frontend/** changed? → frontend-deploy-dev
    └─ backend/** changed? → backend-deploy-dev

Push to `main`
    └─ infra/**  changed? → terraform-validate → terraform-apply-prod (APPROVAL)
    └─ frontend/** changed? → frontend-deploy-prod (APPROVAL)
    └─ backend/** changed? → backend-deploy-prod (APPROVAL)

Pull Request to dev or main
    └─ infra/**  changed? → terraform-validate + terraform-plan (comment on PR)
```

---

## Daily Operations

### SSH into EC2

```bash
# Dev
ssh -i ~/.ssh/broandbro_dev ec2-user@DEV_EC2_IP

# Prod
ssh -i ~/.ssh/broandbro_prod ec2-user@PROD_EC2_IP

# Alternative: AWS SSM Session Manager (no SSH key needed)
aws ssm start-session --target INSTANCE_ID --region ap-south-1
```

### Check application logs

```bash
# Follow live logs
sudo journalctl -u broandbro -f

# Last 100 lines
sudo journalctl -u broandbro -n 100

# Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Manual service management

```bash
sudo systemctl status broandbro
sudo systemctl restart broandbro
sudo systemctl stop broandbro
```

### Manual rollback (backend)

```bash
ssh ec2-user@PROD_EC2_IP
sudo cp /opt/broandbro/app.jar.bak /opt/broandbro/app.jar
sudo systemctl restart broandbro
```

### Rotate database password

```bash
# 1. Update GitHub secret PROD_DB_PASSWORD
# 2. Terraform apply (updates RDS master password)
cd infra/environments/prod
terraform apply -var="db_password=NEW_PASSWORD" -var="ec2_public_key=$(cat ~/.ssh/broandbro_prod.pub)"

# 3. Update EC2 application.env
ssh ec2-user@PROD_EC2_IP
sudo nano /opt/broandbro/config/application.env
# Update SPRING_DATASOURCE_PASSWORD=NEW_PASSWORD
sudo systemctl restart broandbro
```

---

## Infrastructure Updates

### Scale EC2 vertically

```bash
# Edit terraform.tfvars
ec2_instance_type = "t4g.medium"  # was t4g.small

# Apply
terraform apply -var="db_password=..." -var="ec2_public_key=..."
# ⚠️ This will REPLACE the instance (brief downtime ~2-3 minutes)
```

### Scale RDS

```bash
# Edit terraform.tfvars
rds_instance_class = "db.t4g.small"  # was db.t4g.micro

# Prod: applies during next maintenance window (Mon 03:00-04:00 UTC)
# Dev: applies immediately
terraform apply -var="db_password=..." -var="ec2_public_key=..."
```

---

## Safe Destruction

```bash
# ⚠️ DANGER: This deletes all data including the database!

# Dev – safe to destroy any time
cd infra/environments/dev
terraform destroy -var="db_password=..." -var="ec2_public_key=..."

# Prod – take a manual RDS snapshot first!
aws rds create-db-snapshot \
  --db-instance-identifier broandbro-prod \
  --db-snapshot-identifier manual-before-destroy-$(date +%Y%m%d)

# Then disable deletion_protection in modules/rds/main.tf, then:
cd infra/environments/prod
terraform destroy -var="db_password=..." -var="ec2_public_key=..."
```

---

## Monthly Cost Estimate (ap-south-1)

| Service | Dev | Prod |
|---------|-----|------|
| EC2 t4g.micro/small | ~$6 | ~$12 |
| RDS db.t4g.micro/small | ~$13 | ~$26 |
| S3 (storage + requests) | ~$1 | ~$2 |
| CloudFront | ~$1 | ~$3 |
| Route53 | $0.50 | $0.50 |
| Elastic IP | Free (attached) | Free (attached) |
| Data transfer | ~$1 | ~$3 |
| **Total** | **~$23/mo** | **~$47/mo** |

### Cost-saving tips

1. **Stop dev EC2 at night** (saves ~$4/mo):
   ```bash
   # Add Lambda + EventBridge: stop at 22:00 IST, start at 09:00 IST
   aws ec2 stop-instances --instance-ids INSTANCE_ID
   aws ec2 start-instances --instance-ids INSTANCE_ID
   ```

2. **Pause RDS when not in use** (saves ~$13/mo dev):
   ```bash
   aws rds stop-db-instance --db-instance-identifier broandbro-dev
   # Auto-restarts after 7 days (AWS limit)
   ```

3. **Use `PriceClass_100`** for dev CloudFront (already set – saves ~$1/mo)

4. **S3 lifecycle** – already configured (30-day version expiry)

5. **Avoid NAT Gateway** – we use the default VPC (no NAT Gateway = saves $32/mo per AZ)

---

## Scaling Path

| Stage | When | Action |
|-------|------|--------|
| Current | 0-1K users | EC2 t4g.small + RDS db.t4g.micro |
| Growing | 1K-10K users | t4g.medium + db.t4g.small, enable RDS Multi-AZ |
| Scaling | 10K-50K users | Add ALB + 2nd EC2 in different AZ |
| Large | 50K+ users | EC2 Auto Scaling Group + RDS read replica |
| Enterprise | 100K+ | Consider ECS Fargate + Aurora Serverless |

---

## Troubleshooting

### ACM certificate stuck in PENDING_VALIDATION
```bash
# Check that Route53 CNAME records were created
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Type=='CNAME']"

# Check certificate status
aws acm describe-certificate \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions"
```

### EC2 service not starting
```bash
ssh ec2-user@EC2_IP
sudo journalctl -u broandbro -n 100 --no-pager

# Common issues:
# 1. app.jar not deployed yet (first deploy)
ls -la /opt/broandbro/
# 2. Wrong DB credentials in application.env
sudo cat /opt/broandbro/config/application.env
# 3. Can't reach RDS
nc -zv RDS_HOST 5432
```

### CloudFront returns 403 for all files
```bash
# Check S3 bucket policy includes correct CloudFront ARN
aws s3api get-bucket-policy --bucket broandbro-prod-ui

# Force re-apply S3 module
terraform apply -target=module.s3
```

### Terraform state lock stuck
```bash
# If a pipeline crashed mid-apply, you may need to force-unlock
terraform force-unlock LOCK_ID
# Get LOCK_ID from the error message
```

---

## Security Checklist

- [ ] SSH `allowed_cidrs` restricted to your office IP in prod
- [ ] RDS `publicly_accessible = false` (already set)
- [ ] S3 bucket has no public access (already set)
- [ ] Secrets stored in GitHub Environments, not in code
- [ ] `terraform.tfvars` is in `.gitignore`
- [ ] EC2 runs as non-root `broandbro` user
- [ ] OIDC authentication (no long-lived AWS keys in GitHub)
- [ ] Deletion protection enabled on prod RDS

