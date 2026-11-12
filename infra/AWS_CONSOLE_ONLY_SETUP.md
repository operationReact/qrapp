> **SUPERSEDED (Nov 2026):** the owner approved ONE deployed AWS environment, production only.
> Do not create DEV resources from this document. Follow [`PROD_ONLY_RUNBOOK.md`](PROD_ONLY_RUNBOOK.md).

> **CURRENT APPROACH:** No CloudShell or local installation. Follow
> [CloudFormation + GitHub OIDC](AWS_GITHUB_OIDC_NO_CLOUDSHELL.md).
> The older CloudShell steps below are an alternative only; do NOT run
> both bootstrap methods in the same AWS account.

# AWS-Console-only setup (fresh installation in Mumbai)

Target: AWS account `098859530205`, app region `ap-south-1`, GitHub `dev`.
**No installation on a laptop is required.** Bootstrap must be performed by an
authorized operator signed into the new AWS account in the AWS Console.
ChatGPT's GitHub integration can update source and CI, but cannot assume
your AWS console identity or run a Terraform apply.

## One-time action in the AWS console

1. In account `098859530205`, select **Mumbai**. Open **CloudShell**
   (the console terminal, not a terminal on your computer).
2. Paste:

```bash
git clone --depth 1 --branch dev https://github.com/operationReact/qrapp.git
cd qrapp
bash scripts/cloudshell-bootstrap.sh
```

3. Review the Terraform plan and type `yes` to approve creating the initial
   state bucket, GitHub deployment IAM roles, and replacement DNS hosted zone.
   AWS CloudShell supplies temporary credentials automatically. This script
   installs Terraform 1.12.2 **inside CloudShell only** if necessary, verifies
   the downloaded package checksum, and checks account identity before modifying
   resources. It saves an encrypted bootstrap-state backup in the new account.

**Do not change the domain's authoritative nameservers or current website aliases.**

## One-time action in GitHub

If GitHub CLI was not connected in CloudShell, navigate to
`operationReact/qrapp` → **Settings** → **Environments** → **dev**.
Allow deployments only from branch `dev`, then enter:

| Type | Name | Value |
| --- | --- | --- |
| Variable | `AWS_NEW_ACCOUNT_ID` | `098859530205` |
| Variable | `AWS_REGION` | `ap-south-1` |
| Variable | `TF_STATE_BUCKET` | `broandbro-tfstate-098859530205-ap-south-1` |
| Variable | `API_URL` | `https://migrate-dev-api.broandbro.in` |
| Variable | `API_DOMAIN` | `migrate-dev-api.broandbro.in` |
| Secret | `AWS_TERRAFORM_ROLE_ARN` | Printed by CloudShell on successful bootstrap |
| Secret | `AWS_FRONTEND_ROLE_ARN` | Printed by CloudShell on successful bootstrap |
| Secret | `AWS_BACKEND_ROLE_ARN` | Printed by CloudShell on successful bootstrap |

The role ARNs grant time-limited federation via GitHub Actions OIDC. Never put
AWS access keys or account passwords into GitHub Secrets for this migration.

## Deployment order after bootstrap

1. Verify new-account credentials and GitHub role configuration with
   `Terraform Plan - New Account (Read Only)` using the `dev` environment.
2. Prepare the CloudFront ACM certificate in **us-east-1** and copy only
   validation CNAME records to the existing authoritative DNS. The AWS resources
   and Terraform state remain in Mumbai.
3. Manually run `Terraform Apply - New Account DEV` with `APPLY_NEW_DEV`.
   This creates the backend server, private database, S3 buckets, frontend CDN,
   generated SSM parameters and other resources in the NEW AWS account.
4. Enter external Razorpay / Meta WhatsApp credentials securely into **Mumbai SSM
   Parameter Store**; use `EXPECTED_AWS_ACCOUNT_ID=098859530205` when running
   `scripts/set-external-ssm-parameter.sh` in CloudShell.
5. Publish only the new preview DNS hostnames, run AWS preflight, and manually
   dispatch backend/frontend deploy workflows from `dev`.
6. Validate Flyway and remove/quarantine fake seeded menu data, orders, wallets
   and remaining demo fixtures. Confirm real OTP, payment, refund, and login
   flows before admitting actual customers.

The old `www.broandbro.in` site and `main` branch remain unchanged.
A fresh RDS database has no existing customer/order/wallet records, but Flyway
does contain development fixtures that must be reviewed before go-live.
