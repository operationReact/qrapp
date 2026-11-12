> **SUPERSEDED (Nov 2026):** the owner approved ONE deployed AWS environment, production only.
> Do not create DEV resources from this document. Follow [`PROD_ONLY_RUNBOOK.md`](PROD_ONLY_RUNBOOK.md).

> **Next after OIDC verification:** Run the GitHub Action
> **Prepare CloudFront ACM Certificate (New Account DEV)** on branch `dev`
> with confirmation `PREPARE_NEW_DEV_ACM`. This creates only new-account ACM
> certificate/validation records. The Action's summary lists the CNAMEs to
> copy into the **currently authoritative** DNS provider. Never replace
> existing A/AAAA/NS production records. Wait for ACM `ISSUED` before
> full Terraform apply.

# Bro & Bro — GitHub OIDC without CloudShell (new AWS account)

**This replaces the earlier AWS CloudShell bootstrap path.** No laptop
setup, SSH keys, AWS access keys or long-lived GitHub secrets are required.

Target: AWS account **098859530205**; Mumbai **ap-south-1**;
GitHub repository **operationReact/qrapp**, branch **dev**, environment **dev**.

## Step 1 — One-time AWS console setup

1. Sign in to AWS account 098859530205. Select **Mumbai (ap-south-1)**.
   **Do not create this stack in us-east-1.** CloudFront's ACM certificate is
   prepared there later, but bootstrap and application infrastructure use Mumbai.
2. Open **CloudFormation → Stacks → Create stack → With new resources**.
3. Choose **Upload a template file**. Download this repository file via
   GitHub's web UI first:
   `infra/cloudformation/github-oidc-bootstrap-dev.yaml` (branch `dev`).
4. Set stack name to `broandbro-github-oidc-dev`. Review permissions and
   explicitly acknowledge **CAPABILITY_NAMED_IAM**.
5. Wait for **CREATE_COMPLETE**; check **Outputs → ActualAWSAccount**
   is exactly **098859530205**. Copy the three role ARNs from Outputs.

The template **reuses the account-wide GitHub Actions OIDC provider** that already
exists in account `098859530205`, and creates 3 dedicated IAM roles, a private
versioned Terraform state bucket, and a replacement Route 53 hosted zone.
Do not delete or recreate the existing provider: other applications may use it.
The new hosted zone is NOT authoritative until its nameservers are delegated.
**Do NOT change registrar nameservers or existing production DNS records.**

An existing GitHub OIDC provider is expected and is **not** a conflict with this
revised template. If a **role or Terraform state bucket** already exists, stop
and report the CloudFormation error rather than deleting shared resources. Do not run the old `scripts/bootstrap-new-account.sh`
or `scripts/cloudshell-bootstrap.sh` in the same account after CloudFormation
success: they create conflicting resources.

Note: Terraform's bootstrap directory remains for the alternate local/CloudShell
path; resources created by CloudFormation are owned by that CloudFormation
stack and must NOT be imported/managed by Terraform's bootstrap state.

## Step 2 — One-time GitHub UI settings

In GitHub repository `operationReact/qrapp`, open
**Settings → Environments → dev**. Restrict deployment branches to **dev**
only. Restrict who can change this environment/workflows and require review
where the GitHub plan supports it.

Create GitHub **environment variables**:

| Name | Value |
| --- | --- |
| `AWS_NEW_ACCOUNT_ID` | `098859530205` |
| `AWS_REGION` | `ap-south-1` |
| `TF_STATE_BUCKET` | `broandbro-tfstate-098859530205-ap-south-1` |
| `API_DOMAIN` | `migrate-dev-api.broandbro.in` |
| `API_URL` | `https://migrate-dev-api.broandbro.in` |
| `DEV_ACM_CERTIFICATE_ARN` | **Set later:** ARN printed by ACM preparation action, after certificate is `ISSUED` |

Create GitHub **environment secrets** (the ARNs from Step 1):

| Name | CloudFormation output |
| --- | --- |
| `AWS_TERRAFORM_ROLE_ARN` | `TerraformRoleArn` |
| `AWS_FRONTEND_ROLE_ARN` | `FrontendRoleArn` |
| `AWS_BACKEND_ROLE_ARN` | `BackendRoleArn` |

These are *role identifiers*, not static security keys.

## Step 3 — Verify OIDC with GitHub Actions

Open **Actions → Verify New AWS Account OIDC (No CloudShell)**.
Click **Run workflow**, choose **dev**, then check the result.

This check verifies AWS identity and state bucket without creating
EC2/RDS/CloudFront. Next run **Prepare CloudFront ACM Certificate (New Account DEV)**
with confirmation `PREPARE_NEW_DEV_ACM`. It requests a preview certificate in
`us-east-1` and prints CNAME records in its GitHub job summary; it does NOT
modify DNS. Add those CNAMEs to the existing authoritative DNS provider. Run
the ACM action again to verify status becomes `ISSUED`; then add the ARN to
GitHub `dev` environment variable `DEV_ACM_CERTIFICATE_ARN`.

Only then run **Terraform Plan - New Account (Read Only)** for `dev`.
The Terraform plan/apply workflows now fail closed until the ACM certificate
is `ISSUED` and bound to this exact new AWS account.

## Remaining workflow

1. CloudFront ACM certificate is managed in **us-east-1** through the
   **Prepare CloudFront ACM Certificate (New Account DEV)** GitHub Action.
   Copy its validation CNAMEs into the currently authoritative DNS provider,
   verify `ISSUED`, and set `DEV_ACM_CERTIFICATE_ARN` before Terraform.
2. Apply `dev` Terraform in Mumbai only after preview DNS validation.
3. Put Razorpay and WhatsApp values securely into **SSM Parameter Store in
   ap-south-1** (not GitHub repository files). These values stay user-controlled.
4. Deploy backend and frontend using GitHub Actions from the `dev` branch.
5. Validate Flyway initialization and remove/quarantine legacy demo customers,
   sample orders, wallets and menu fixtures before public access.

No historical customer/order/wallet/media migration is planned.
The old account and the existing production site remain untouched until a
separately approved cutover.

**Safety:** GitHub OIDC trusts the `dev` GitHub Environment, so its deployment
branch protection is necessary. The Terraform role has powerful provisioning
permissions across multiple AWS services inside the target account; review
the template and secure branch/environment write access before authorizing it.
