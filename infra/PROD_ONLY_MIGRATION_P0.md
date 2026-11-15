# Bro & Bro / QR App — production-only AWS migration

**Status (2026-11-15): CODE PREPARATION ONLY. No evidence of a completed AWS apply or successful app smoke test.**

## Non-negotiable deployment contract

- Repository: `operationReact/qrapp`.
- Destination AWS account: `098859530205`; main infrastructure: `ap-south-1` (Mumbai). CloudFront ACM and global WAF are in `us-east-1`.
- **One production environment only**. Do not provision a dev or staging EC2, RDS, CloudFront, or supporting dev resources.
- Production application infrastructure is managed by `infra/environments/prod` Terraform, and deployed with existing manual `prod` GitHub Actions workflows from `main`.
- No automatic Terraform apply or DNS change on merge. Existing `broandbro.in` / `www.broandbro.in` and existing production account remain intact until explicit DNS cutover approval.
- Fresh database; **no historical customer, order, wallet, or media migration**. Prevent demo customer/order/wallet fixtures and known seed accounts from becoming live.
- Never copy API keys or customer data into Terraform state, GitHub commits, action logs, or issue comments. Vendor secrets go into new-account SSM SecureString/Secrets Manager as appropriate.
- Do not delete existing GitHub OIDC identity providers. The `token.actions.githubusercontent.com` provider is account-wide.

## Phase 0 — mandatory read-only inventory in AWS

Operator: sign in to the **destination account**, select **Mumbai (ap-south-1)**, and verify account ID `098859530205`. If local AWS CLI SSO is available:

```bash
aws sts get-caller-identity --profile broandbro-new --region ap-south-1
aws cloudformation describe-stacks --profile broandbro-new --region ap-south-1
aws iam list-open-id-connect-providers --profile broandbro-new
aws iam list-roles --profile broandbro-new --query "Roles[?starts_with(RoleName, 'broandbro-')].[RoleName,Arn]" --output table
aws s3api head-bucket --bucket broandbro-tfstate-098859530205-ap-south-1 --profile broandbro-new
aws route53 list-hosted-zones-by-name --dns-name broandbro.in --profile broandbro-new
aws ec2 describe-instances --region ap-south-1 --profile broandbro-new --query "Reservations[].Instances[].[InstanceId,State.Name,Tags]"
aws rds describe-db-instances --region ap-south-1 --profile broandbro-new
aws cloudfront list-distributions --profile broandbro-new --query "DistributionList.Items[].[Id,DomainName,Aliases.Items]"
```

The S3 head-bucket command may return a nonzero exit when absent. **Do not conclude that a conflicting name is safe to create from that result alone**; verify ownership and target region. Compare existing CloudFormation, Terraform state, buckets, DNS zones, RDS, EC2, distributions, SSM parameters and any old-account resources. The results of this phase determine what is already created and prevent duplicate infrastructure. Do not paste secrets or full resource metadata into a public repository.

## Phase 1 — production-only GitHub OIDC bootstrap

A new guarded template is supplied at
`infra/cloudformation/github-oidc-bootstrap-prod-only.yaml`.

The template **reuses the existing GitHub OIDC provider**, provisions only production-named IAM roles, and accepts two optional creation parameters:

| Parameter | Default | Set to `true` only when |
| --- | --- | --- |
| `CreateStateBucket` | `false` | The named target-account state bucket is verified absent |
| `CreateHostedZone` | `false` | The target-account replacement Route 53 zone is verified absent |

The defaults prevent accidental duplicate S3/Route 53 resource creation. If the bucket or zone already exists, keep the corresponding parameter false. If an IAM role already exists, **stop**: do not delete it or force CloudFormation to replace it. Reconcile its existing trust policy and ownership first.

After review, create this CloudFormation stack in `ap-south-1` (e.g. `broandbro-prod-oidc`) with `CAPABILITY_NAMED_IAM`. Verify output account ID **exactly** equals `098859530205`. Record the three production role ARNs. A printed Terraform bucket name does **not** confirm the bucket exists; verify it separately.

**Do not run the alternate `infra/bootstrap/bootstrap.tf` or `scripts/bootstrap-new-account.sh` in an account with a CloudFormation bootstrap.** They still contain multi-environment provisioning and can conflict with existing resources. Do not run the DEV-only CloudFormation template.

## Phase 2 — GitHub production environment and plan

In GitHub `operationReact/qrapp` → Settings → Environments → `prod`:
- Restrict eligible deployment branch to `main`, require reviewer approval, and protect changes to workflows and infrastructure.
- Environment variables: `AWS_NEW_ACCOUNT_ID=098859530205`, `TF_STATE_BUCKET=broandbro-tfstate-098859530205-ap-south-1`, `API_DOMAIN=migrate-prod-api.broandbro.in`, `API_URL=https://migrate-prod-api.broandbro.in`.
- Environment secrets: `AWS_TERRAFORM_ROLE_ARN`, `AWS_FRONTEND_ROLE_ARN`, `AWS_BACKEND_ROLE_ARN` from reviewed production CloudFormation outputs. These are **IAM role identifiers**, not permanent AWS access keys.

The production workflows are configured to run manually from `main`; changes prepared on `dev` must be reviewed and promoted to `main` before use. Do not inadvertently deploy a migration PR or dev-only changes.

Run existing offline Terraform validation / plan workflows first. Require the plan to show one production EC2, one production RDS, production S3 buckets, frontend CloudFront, monitoring, SSM configuration and required network/DNS. Record the resource diff and estimated monthly AWS cost for explicit approval. Check for unexpected deletes, replacements, state drift, public RDS, or unauthorized domain aliases. **Never apply an unreviewed plan.**

The production apply workflow is `.github/workflows/terraform-apply-prod.yml` (manual input `APPLY_NEW_PROD`). It may create billable resources: only invoke after reviewed plan approval.

## Phase 3 — certificate and preview deployment

- Validate new account CloudFront ACM certificate in `us-east-1`. Publish **only** necessary ACM validation CNAMEs to the authoritative DNS provider. Do not change apex/www/API aliases or registrar nameservers yet.
- Provision using production Terraform, then deploy backend via `.github/workflows/backend-deploy-prod.yml` and frontend via `.github/workflows/frontend-deploy-prod.yml`.
- Preview hostnames: `migrate-prod.broandbro.in` and `migrate-prod-api.broandbro.in` (only publish these after infrastructure works).
- Populate new-account SSM with Razorpay, Meta/WhatsApp OTP and any other vendor secrets using secure channels. Never paste them into GitHub.
- Confirm app health, RDS/Flyway migration, customer onboarding, QR table ordering, cart, prices/taxes, order lifecycle, admin/partner roles, OTP delivery, invoices, refunds, payment callback signature verification, and Android asset links. Use vendor sandbox/test modes where appropriate before live financial transactions.
- Do not treat a successful CloudFormation stack, Terraform apply, CI build or HTTP 200 alone as proof of usable production.

## Phase 4 — owner-approved cutover

Approve DNS cutover separately **only after** preview smoke tests, backup/restore check, CloudWatch alarms and rollback procedure pass. Migrate CloudFront aliases without ownership conflicts, update production API hostname, verify TLS/CORS/redirects and mobile app links, and test after DNS propagation. Preserve the previous deployment and its rollback routing until explicitly approved for retirement.

## Cost and safety defaults

- No dev or staging infrastructure; no prod shutdown schedule; do not start EC2/RDS in another environment.
- Avoid NAT Gateway unless justified; EC2, RDS, public IPv4, EBS, S3, CloudFront and data transfer can incur recurring costs.
- Prod RDS is currently Single-AZ, backup retention 7 days, deletion protection enabled; do not sacrifice backups or recovery to reduce cost.
- WAF is currently enabled by default in production Terraform and has extra charges; explicitly review the security/cost choice before applying.
- Set AWS Budget and anomaly alerts, CloudWatch monitoring, log retention and payment error notifications before launch.

## Evidence-based release checklist

- [ ] Confirm target-account AWS inventory, and no duplicate state bucket/zone/roles
- [ ] Production-only bootstrap roles or verified pre-existing equivalents
- [ ] Prod GitHub environment restricted and OIDC assume-role succeeds
- [ ] Production ACM certificate ISSUED in us-east-1
- [ ] Reviewed and approved Terraform plan; actual production apply succeeded
- [ ] Backend and frontend deployed to new-account preview hostnames
- [ ] Vendor secrets in new-account SSM; no secrets in repository
- [ ] Fresh DB; seeded demo identities and financial records excluded from public use
- [ ] OTP, QR ordering, payments, invoices and admin flows verified
- [ ] Monitoring, backup/restore and cost alerts verified
- [ ] Separately approved domain cutover and rollback test
- [ ] Old-account resource retirement after stability window

**Status ownership:** Github commits/PRs indicate code preparation; only AWS identity/inventory, actual deployment logs, live functional tests and explicit user approvals can establish readiness.
