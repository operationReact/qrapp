# Bro & Bro — GitHub OIDC without CloudShell (new AWS account)

**This replaces the earlier AWS CloudShell bootstrap path.** No laptop
setup, SSH keys, AWS access keys or long-lived GitHub secrets are required.

Target: AWS account **098859530205**; Mumbai **ap-south-1**;
GitHub repository **operationReact/qrapp**, branch **dev**, environment **dev**.

## Step 1 — One-time AWS console setup

1. Sign in to AWS account 098859530205. Select **Mumbai (ap-south-1)**.
2. Open **CloudFormation → Stacks → Create stack → With new resources**.
3. Choose **Upload a template file**. Download this repository file via
   GitHub's web UI first:
   `infra/cloudformation/github-oidc-bootstrap-dev.yaml` (branch `dev`).
4. Set stack name to `broandbro-github-oidc-dev`. Review permissions and
   explicitly acknowledge **CAPABILITY_NAMED_IAM**.
5. Wait for **CREATE_COMPLETE**; check **Outputs → ActualAWSAccount**
   is exactly **098859530205**. Copy the three role ARNs from Outputs.

The template creates only the GitHub OIDC provider, 3 IAM roles, a private
versioned Terraform state bucket, and a replacement Route 53 hosted zone.
The new hosted zone is NOT authoritative until its nameservers are delegated.
**Do NOT change registrar nameservers or existing production DNS records.**

If OIDC provider/role/state bucket already exists, stop and report the
CloudFormation error. Do not run the old `scripts/bootstrap-new-account.sh`
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
EC2/RDS/CloudFront. Then use **Terraform Plan - New Account (Read Only)**,
environment `dev`, to review what AWS would create.

## Remaining workflow

1. ACM certificate for CloudFront still lives in **us-east-1**. The existing
   domain's authoritative DNS must receive the new-account ACM validation
   CNAMEs before full Terraform apply. Use an account-authorized GitHub Actions
   ACM-preparation workflow when available; do not change the existing A/AAAA.
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
