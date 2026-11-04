# Bro & Bro — Mumbai new-account deployment runbook (dev branch first)

> Status: Mumbai-targeted code prepared; offline checks do not prove a live AWS apply.
> Target account: `098859530205`; primary region: `ap-south-1`.
> CloudFront ACM certificates and CloudFront WAF remain in `us-east-1`.
> `main` was merged INTO `dev`; `main` itself is unchanged.
> Approved approach: FRESH installation in the new account, NO old customer/order/wallet/media migration.
> Keep `www.broandbro.in` on the existing hosting account until a separate cutover approval.

## Principles
- AWS account construction is automated; the operator authenticates, does not create resources by hand.
- All apply/deploy actions are manual dispatch and verify the NEW account ID.
- Never reuse old-account Terraform state, IAM ARN, WAF ARN, or S3 bucket names.
- No Terraform code change should deploy into the old account.
- RDS master password is generated and managed by RDS Secrets Manager.
- Automatic master-secret rotation is temporarily disabled because the app consumes
  credentials at startup. Re-enable after implementing tested runtime refresh.
- Terraform creates *all* SSM parameter names and generated values.
- Only vendor API tokens are operator-supplied; they use SecureString write-only
  placeholders to avoid storing plaintext in Terraform state.
- No SSH private key or port 22 is required; backend deploys use SSM Run Command.
- Fresh install requested: do not import existing customer records, wallets or orders.
- Flyway can create tables and also seeds DEMO rows: confirm test data is absent from
  customer-facing UI before public launch. V167 revokes known hardcoded seeded logins;
  the seeded superadmin requires WhatsApp password recovery to claim securely.

## 1. Obtain authenticated, short-lived credentials (operator)

Provision a NEW account and configure a local AWS CLI SSO profile named, for
example, `broandbro-new`. This is an authentication step, NOT manual creation
of AWS infrastructure.

```bash
aws sso login --profile broandbro-new
AWS_PROFILE=broandbro-new aws sts get-caller-identity --region ap-south-1
```

Use the 12-digit NEW account ID from that output. Verify the old and new IDs
are different. Keep the old account running for rollback.

## 2. Run ONE automated bootstrap (AWS resources created by Terraform)

On `dev`, with Terraform >= 1.12 and AWS CLI v2:

```bash
AWS_PROFILE=broandbro-new ./scripts/bootstrap-new-account.sh 098859530205 ap-south-1
```

This provisions:
- Versioned private S3 state bucket, native S3 state locking (no DynamoDB bill)
- Restricted GitHub Actions OIDC trust identities and three roles per environment
- New public Route 53 zone and nameserver outputs
- Encryption and public-access controls

It also configures GitHub environment variables and role ARNs if the `gh`
CLI is authenticated. The first bootstrap uses LOCAL Terraform state by
necessity; back up `infra/bootstrap/terraform.tfstate` to a restricted secure
location. Never commit it.

If GitHub CLI is not authenticated, configure the output role ARNs as GitHub
environment secrets and `AWS_NEW_ACCOUNT_ID`, `TF_STATE_BUCKET`, `API_URL`
and `API_DOMAIN` as GitHub environment variables.

**Critical:** configure branch restrictions for `dev` and required reviewers
and branch restrictions for `prod` in GitHub Environments. Ensure the
migration workflow has only the new-account role, not the old one.

## 3. DNS replication before delegating nameservers

The bootstrap automatically creates the NEW hosted zone, but does NOT change
the current registrar's authoritative nameservers.

If the original public zone lives in Route 53, the existing records can be
copied using the read-old/write-new script:

```bash
./scripts/mirror-route53-records.sh OLD_PROFILE NEW_PROFILE OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID --dry-run
./scripts/mirror-route53-records.sh OLD_PROFILE NEW_PROFILE OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID --execute
```

`OLD_ZONE_ID` comes from the old account; `NEW_ZONE_ID` is a bootstrap
output. The script excludes the old zone's NS/SOA records, and preserves
third-party TXT/MX/CAA records as well as existing A records. Audit the copy
and lower DNS TTLs where needed. Then arrange registrar nameserver delegation
to the new zone (the only external registrar operation). The old application
continues receiving traffic because the mirrored DNS points to old targets.

CloudFront certificate DNS validation requires publicly resolvable records.
A new AWS account cannot attach the current production CloudFront alias
until the controlled alias-migration step. New-account preview URLs use
`migrate-dev.broandbro.in`, `migrate-dev-api.broandbro.in`, and matching
`migrate-prod` hostnames to avoid early collision.

## 3a. Mandatory ACM validation while OLD DNS remains authoritative

The replacement hosted zone is not publicly authoritative until registrar
nameserver delegation. Even if Terraform creates validation CNAMEs inside that
new zone, ACM cannot validate them and a full infrastructure apply will hang.

For Route 53-hosted old DNS, use the safe two-account preflight (default dry-run):

```bash
./scripts/prepare-acm-validation.sh OLD_PROFILE NEW_PROFILE dev OLD_ZONE_ID NEW_ACCOUNT_ID --dry-run
./scripts/prepare-acm-validation.sh OLD_PROFILE NEW_PROFILE dev OLD_ZONE_ID NEW_ACCOUNT_ID --execute
```

The script verifies different AWS identities and the exact old hosted-zone name,
uses a narrowly-targeted Terraform apply to create/track the certificate and
new-zone records, and mirrors only ACM validation CNAMEs into the OLD public DNS.
It does NOT move apex/www/API aliases or alter nameserver delegation.

Wait until the ACM certificate reports `ISSUED` before a full apply. Later,
run this workflow separately for production when production preparation begins.
If the OLD authoritative DNS is not in Route 53, a DNS-provider-specific
automated API integration will be required; do not move nameservers prematurely.

## 3b. Preview record resolution

New-account preview alias records are initially created in the replacement
hosted zone only. They are NOT publicly resolvable before registrar delegation.
After the guarded new-account dev infrastructure apply, mirror ONLY the two
preview A records to the OLD authoritative zone. This is automated, including
read-only identity checks and collision protection:

```bash
./scripts/publish-preview-dns.sh OLD_PROFILE NEW_PROFILE dev OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID --dry-run
./scripts/publish-preview-dns.sh OLD_PROFILE NEW_PROFILE dev OLD_ZONE_ID NEW_ZONE_ID NEW_ACCOUNT_ID --execute
```

This does not replace the apex/www/API production aliases. Run for prod later,
after production preview infrastructure is created. For non-Route 53 DNS
providers, integrate their DNS API rather than performing manual resource
creation.

## 4. Create DEV resources through the GitHub workflow

Run `Terraform Offline Validate (No AWS Credentials)` first. Run the
`Terraform Plan - New Account` workflow against `dev`, check account and
resource types, then manually dispatch `Terraform Apply - New Account DEV`
on the dev branch with confirmation `APPLY_NEW_DEV`.

Terraform creates:
- Dedicated VPC, one internet-facing subnet, two private DB subnets and IGW
- VPC security groups: public HTTP/HTTPS to EC2, private DB only from EC2
- EC2 instance, IAM profile, SSM agent, EIP and encrypted gp3 storage
- PostgreSQL RDS with AWS Secrets Manager-generated password and automatic
  `database/url`, `database/username`, `database/secretArn` SSM parameters
- Frontend private S3 + OAC + CloudFront
- Public-prefix media/location S3; separate PRIVATE deploy-artifact S3
- ACM certificate validation records, Route 53 records
- CloudWatch, SNS, and optional start/stop scheduler
- Complete application SSM configuration namespace including external placeholders

No manual creation of any listed AWS resource is needed.

## 5. Set external service credentials after Terraform creates placeholders

The only user-provided values are third-party vendor credentials: Razorpay,
Meta WhatsApp, OpenAI, etc. They are created by Terraform as SSM SecureString
placeholders with write-only provider support. Update using:

```bash
AWS_PROFILE=broandbro-new EXPECTED_AWS_ACCOUNT_ID=098859530205 ./scripts/set-external-ssm-parameter.sh dev razorpay/key
AWS_PROFILE=broandbro-new EXPECTED_AWS_ACCOUNT_ID=098859530205 ./scripts/set-external-ssm-parameter.sh dev whatsapp/accessToken
```

Also set razorpay/secret, razorpay/webhookSecret, whatsapp/appSecret,
whatsapp/phoneNumberId, whatsapp/webhookVerifyToken, openai/apiKey as needed.
The script prompts without echoing. The application must not go live while
`MISSING_EXTERNAL_CREDENTIAL` remains in required credentials.

If values can legally be reused in the new account, the
`scripts/migrate-external-ssm.sh` script can copy ONLY these external values
under two authenticated short-lived AWS CLI profiles. Its default is dry-run;
`--execute` is explicit. Generated DB, bucket, CDN and EC2 parameters MUST
NEVER be copied from the old account.

Important: values in the old SSM Parameter Store may be encrypted with
different KMS keys; the source profile must be authorized to decrypt them.
The target account re-encrypts them.

## 5a. Verify provisioned AWS resources (read-only)

After the dev Terraform apply and before application deployment, execute:

```bash
AWS_PROFILE=broandbro-new python3 scripts/preflight-new-account.py \
  --environment dev --account 098859530205
```

The customer-facing dev environment is configured to remain running around the clock.
Do not append `--allow-stopped` for a launch preflight.
The preflight checks the authenticated account, RDS private/encrypted state,
EC2 security group and Systems Manager agent, S3 privacy, generated SSM
values and the preview CloudFront distribution. It does NOT read any external
API secret values, alter resources, or migrate customer data.

A failed preflight blocks further deployment until the underlying AWS issue is
corrected. Run it again after changes. For production use `--environment prod`
without `--allow-stopped`.

## 6. Deploy/test applications in DEV

Manually dispatch dev frontend and backend workflows. The UI uses the preview
API URL from the GitHub environment, and the backend uses private S3 artifacts
and SSM Run Command; GitHub never stores EC2 SSH private keys.

Test order placement, login, payment callbacks, wallet amounts, invoices,
image reads/writes, PWA/Android assetlinks, monitoring, DB connectivity,
SSM IAM, emergency rollback and always-on EC2/RDS availability.

## 7. Fresh-install acceptance (NO legacy data transfer)

This migration intentionally discards the existing account's customers, wallets,
orders and media; Terraform provisions an empty RDS instance. Spring Boot Flyway
initializes schema AND legacy sample records (including demo menu items, wallets,
and simulated orders) on first startup. The V167 safety migration revokes public
demo login credentials and replaces the seeded admin's known password.

Before allowing customers or REAL Razorpay payments:
- Verify Flyway migrations complete successfully with PostgreSQL in Mumbai.
- Recover the seeded superadmin via WhatsApp OTP password reset; validate ownership.
- Remove or quarantine demo menu items, fake paid orders and fixture wallet balances
  in the NEW database through a reviewed, backup-protected cleanup procedure.
- Set the actual menu, business locations, taxes, invoice settings, and payment modes.
- Provide WhatsApp/Meta and Razorpay credentials; backend deployments refuse
  missing credentials even when deployed from the dev branch.
- Validate refunds, webhook signatures, end-to-end ordering, wallet correctness,
  and account logout behavior before exposing new URLs to customers.
- The old application continues independently; new account users must register
  afresh. Do not redirect the old domain without explicit separate approval.

## 8. Production deployment + cutover

Only after successful fresh-install acceptance, preview testing, required
GitHub reviewer protection and an approved maintenance window:

- Run production plan/apply after dev changes are reconciled with main.
- Deploy backend and frontend by manual dispatch from main to preview names.
- Validate a new, clean catalog and all integrations without live traffic.
- Coordinate CloudFront alternate-domain transfer and DNS changes.
- Run production smoke tests, audit payment/wallet records, monitor and retain
  the original infrastructure until rollback window expires.
- Retire the old account resources LAST, never as part of a new-account apply.

## Cost scheduler

Optional dev schedule (DISABLED for the 24/7 deployment):
- RDS start 09:00 IST
- EC2 start 09:30 IST
- EC2 stop 20:00 IST
- RDS stop 20:15 IST

All timings are Terraform cron variables, timezone configurable. Both dev
and prod scheduling are OFF by default for this always-on deployment. Never schedule production downtime without an
approved service window. RDS instances can be stopped only temporarily:
AWS restarts stopped RDS instances after a maximum of 7 days. EBS, S3, IP
addresses, CloudFront, snapshots, and WAF can remain billable while compute is
stopped. No NAT Gateway is deployed.

## Current limitations / approvals

- No AWS account is connected in this chat: IAM authorization and live plans
  cannot be tested here.
- No real AWS resources have been created or runtime smoke-tested through this chat.
- No legacy data migration is planned or required; new-data initialization must be tested.
- External credentials require your direct authenticated entry.
- Registrar delegation and payment/webhook account updates remain external.
- The main history is already merged into dev; only dev has the unreleased new-account changes.
- GitHub offline `terraform validate` is not proof that actual apply will
  complete; verify AWS quotas, subscription services and permissions on
  first dev apply.
