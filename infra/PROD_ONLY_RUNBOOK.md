# Bro & Bro — new AWS account, PRODUCTION ONLY runbook

**Supersedes** the DEV-first steps in `NEW_AWS_ACCOUNT_RUNBOOK.md`, `AWS_GITHUB_OIDC_NO_CLOUDSHELL.md`
and `AWS_CONSOLE_ONLY_SETUP.md` (they are kept for history only).

| | |
|---|---|
| Owner decision (Nov 2026) | **Exactly one deployed AWS environment: `prod`.** No DEV/staging/QA stacks. |
| Target account / region | `098859530205` / `ap-south-1` (Mumbai). ACM for CloudFront lives in `us-east-1` (AWS requirement, not a 2nd environment). |
| Preview hostnames | `migrate-prod.broandbro.in`, `migrate-prod-api.broandbro.in` → the **same** prod stack. |
| Final hostnames | `broandbro.in`, `www.broandbro.in` (+ the current canonical API host) — only at a separately approved cutover. |
| Data | **Fresh install.** No legacy users, wallets, orders, media or balances are imported. Old account is kept untouched for rollback/audit. |
| Git | The `dev` *branch* stays for development. Production workflows run only from `main`. |

## No DEV environment (removed)

The DEV AWS environment, its Terraform environment folder, its bootstrap paths and its workflows are deleted from the repository.
CI fails if any DEV infrastructure or `*-dev` AWS workflow is reintroduced. Git branch `dev` remains for source control only.

## Automatic provisioning (after the one-time bootstrap)

* Push to `main` that changes `infra/**` -> **Terraform Apply - New Account PROD** runs the plan automatically and saves it.
* The apply job waits for approval on GitHub environment `prod` (required reviewer) and then applies exactly that saved plan.
  This is the one human gate that remains: an AWS change still needs an explicit approval click.
* The one unavoidable manual step is the CloudFormation bootstrap (step 1): GitHub cannot assume an AWS role until that role exists.
* The ACM certificate must be ISSUED first (step 4); its DNS CNAMEs are added by the owner at the authoritative DNS provider.
  Until `PROD_ACM_CERTIFICATE_ARN` is set, the automatic plan fails closed by design.

## Cost settings in this revision

| Setting | Before | Now | Notes |
|---|---|---|---|
| EC2 root EBS (gp3) | 30 GiB | 20 GiB | EBS can be grown later, not shrunk |
| CloudWatch log retention | 90 days | 30 days | |
| AWS Budget | none | `MONTHLY_BUDGET_USD` (default 100) | alerts at 80% actual, 100% forecast |
| Cost schedule (EC2/RDS stop) | off | off | kept off: public production |
| WAF | on | on | ~US$8-12/mo; disabling it is an owner decision (`enable_waf`) |
| RDS / EC2 class, Single-AZ | t4g.small / t4g.small, Single-AZ | unchanged | smaller classes are a workload decision |
| CloudFront price class | PriceClass_200 | unchanged | PriceClass_100 excludes India, so it would not serve the audience |

## Account-safety guards (all prod workflows)

* Account `098859530205` and region `ap-south-1` are **hard-coded** and checked against both the GitHub variables and
  `sts:GetCallerIdentity`. A `prod` GitHub environment still holding old-account values fails closed.
* The Terraform AWS provider uses `allowed_account_ids`, plus a `terraform_data.account_guard` precondition.
* Terraform apply refuses unless `AWS_TERRAFORM_ROLE_ARN` is exactly `arn:aws:iam::098859530205:role/broandbro-prod-terraform-github`.

> **Important finding (P0):** `Backend Deploy-Prod` last succeeded on 12 Oct 2026 from `main` using the
> *old* workflow (`secrets.AWS_ROLE_ARN`, `us-east-1`), i.e. almost certainly the **old** account serving the live site.
> The GitHub `prod` environment therefore probably still contains old-account secrets. Replace them in step 3; never
> run the old workflow again.

## Order of operations

Each step names who does it and the evidence that closes it.

### 0. Read-only inventory (owner, AWS console, ~10 min)

In account `098859530205`, Mumbai, record (no changes):

1. CloudFormation → stacks named `broandbro-*` (e.g. an earlier `broandbro-github-oidc-dev`).
2. S3 → does `broandbro-tfstate-098859530205-ap-south-1` exist? Any `broandbro-dev-*` buckets?
3. Route 53 → hosted zones named `broandbro.in` (how many?).
4. IAM → Identity providers: `token.actions.githubusercontent.com` must exist (audience `sts.amazonaws.com`).
   IAM → Roles named `broandbro-*`.
5. EC2 / RDS / CloudFront → anything at all (should be empty for a fresh account; report any `dev` resources).

If any DEV compute/RDS/CloudFront exists, **stop and report**; removal is a separately approved step.

### 1. Prod-only bootstrap (owner, CloudFormation console)

* Template: `infra/cloudformation/github-oidc-bootstrap-prod.yaml`, stack name **`broandbro-github-oidc-prod`**, region **Mumbai**.
* `StateBucketMode`: `existing` if step 0.2 found the bucket, else `create`.
* `HostedZoneMode`: `existing` if step 0.3 found a zone, else `create`. Never create a second zone.
* The stack **fails at creation** on any account other than `098859530205` or any region other than `ap-south-1`.
* If an old `broandbro-github-oidc-dev` stack exists, it is harmless to leave it until a separately approved cleanup;
  its roles trust only GitHub environment `dev`, which no longer has a working workflow. (Its bucket/zone have
  `DeletionPolicy: Retain`, so deleting that stack later will not delete state or DNS.)
* Evidence: `CREATE_COMPLETE`, output `ActualAWSAccount = 098859530205`, three role ARNs.

### 2. GitHub environment `prod` (owner, repo Settings → Environments → prod)

| Kind | Name | Value |
|---|---|---|
| Variable | `AWS_NEW_ACCOUNT_ID` | `098859530205` |
| Variable | `AWS_REGION` | `ap-south-1` |
| Variable | `TF_STATE_BUCKET` | `broandbro-tfstate-098859530205-ap-south-1` |
| Variable | `API_DOMAIN` | `migrate-prod-api.broandbro.in` (preview only) |
| Variable | `API_URL` | `https://migrate-prod-api.broandbro.in` (preview only) |
| Variable | `ALARM_EMAIL` | an inbox you monitor (CloudWatch alarms + AWS Budget) |
| Variable | `MONTHLY_BUDGET_USD` | optional, default `100` |
| Variable | `PROD_ACM_CERTIFICATE_ARN` | set in step 4 |
| Secret | `AWS_TERRAFORM_ROLE_ARN` | stack output `TerraformRoleArn` |
| Secret | `AWS_FRONTEND_ROLE_ARN` | stack output `FrontendRoleArn` |
| Secret | `AWS_BACKEND_ROLE_ARN` | stack output `BackendRoleArn` |
| Delete | `AWS_ROLE_ARN` and any other old-account secret | — |
| Protection | Required reviewers = owner; deployment branches = `main` only | — |

No AWS access keys anywhere.

### 3. Promote the reviewed release to `main` (Claude prepares, owner approves)

Compare `dev`…`main`, and merge only the reviewed migration work. Do not release open draft UI PRs (#231, #234, #235).

### 4. Verify OIDC + inventory, then the certificate

1. Run **Verify New AWS Account PROD (OIDC + read-only inventory)** from `main` → job summary is the P0 evidence table.
2. Run **Prepare CloudFront ACM Certificate (New Account PROD)** with `PREPARE_NEW_PROD_ACM`. It requests (or reuses)
   one `us-east-1` certificate for `broandbro.in`, `www.broandbro.in`, `migrate-prod.broandbro.in`,
   `migrate-prod-api.broandbro.in` and prints four `_…` validation CNAMEs.
3. **Owner:** add only those CNAMEs at the **currently authoritative** DNS provider. They do not change what serves
   the site today. Records in the new account's Route 53 zone do not count (that zone is not delegated).
4. Re-run until `ISSUED`; set variable `PROD_ACM_CERTIFICATE_ARN`. Plan and apply refuse to run without an ISSUED
   certificate that covers all four names.

### 5. Plan → approve → apply (owner approval required)

1. **Terraform Plan - New Account PROD (Read Only)** → resource-by-resource table in the job summary. The plan
   **fails** if it contains more than one EC2/RDS/CloudFront, any NAT gateway/LB/ASG, or a DB/bucket/zone deletion.
2. **Terraform Apply - New Account PROD** with `APPLY_NEW_PROD`: stage 1 saves and summarizes the plan; stage 2 waits
   for a second `prod` approval and applies exactly that saved plan.
3. Confirm the AWS Budget email subscription and the SNS alarm subscription emails.

### 6. Secrets, DNS for the preview API, deploy

1. **Owner:** enter vendor values into SSM SecureString in the new account with `scripts/set-external-ssm-parameter.sh`
   (Terraform creates the names with a write-only placeholder, never stored in state). Never paste values into chat,
   tickets or git.
2. **Owner:** at the authoritative DNS provider, add `migrate-prod-api.broandbro.in  A  <Elastic IP from apply output>`
   and `migrate-prod.broandbro.in  CNAME  <CloudFront domain from apply output>`. Do not touch apex/www/api.
   The backend deploy agent obtains the API's Let's Encrypt certificate only after this A record resolves.
3. Run **Backend Deploy prod (new account, SSM)**, then **Frontend Deploy-Prod**, both from `main`.

### 7. Acceptance on the preview hostnames (P5)

Health endpoint, Flyway completion, OTP login, roles, menu/location/images, cart → checkout → Razorpay **test** capture,
webhook signature + replay idempotency, refund, wallet arithmetic, invoice, PWA/service worker,
`/.well-known/assetlinks.json`, CloudWatch logs/alarms, RDS backup + a test restore.
Remove/quarantine Flyway demo catalog, fake orders and fixture wallet balances (V167 already revokes demo logins).
Securely claim the initial superadmin.

### 8. Public cutover (separate written approval) and 9. old-account retirement (separate approval)

Cutover record must include: current DNS records + TTLs (lowered 24-48 h ahead), old CloudFront distribution/alias,
old API endpoint, known-good artifacts on both sides, a write-freeze window, and what happens to orders placed on the
old stack during the window (fresh-install decision means they are **not** migrated automatically).
CloudFront alias move: the apex/www aliases can only be attached to the new distribution after they are removed from
the old one (or via an approved alias move), so plan a short window. Update Razorpay/Meta webhook URLs only at cutover.

## Monthly cost model (estimate — confirm in AWS Pricing Calculator for ap-south-1)

Rough on-demand figures for a low-traffic launch; **not** quotes, and old README USD numbers do not apply.

| Item | Config | Est. USD/month |
|---|---|---|
| EC2 backend | 1 × `t4g.small`, always on | ~10–13 |
| EBS root | 30 GiB gp3 | ~2.5–3 |
| Public IPv4 (Elastic IP) | 1 | ~3.6 |
| RDS PostgreSQL | `db.t4g.small`, Single-AZ, 20 GiB gp2/gp3, 7-day backups | ~28–36 |
| AWS WAF (CloudFront) | 1 web ACL + managed rule groups + requests | ~8–12 |
| CloudFront + S3 | `PriceClass_200`, low traffic | ~1–5 |
| CloudWatch | logs 90-day retention, alarms, dashboard | ~3–6 |
| Secrets Manager / SSM | RDS managed secret; SSM standard params free | ~0.5 |
| Route 53 | 1 hosted zone (+ queries after cutover) | ~0.5–1 |
| **Total** | | **~57–80** |

Biggest levers, in order (each needs an owner decision; none is applied silently):
WAF (~$8–12; keep for a public payment site), RDS class, 90-day → 30-day log retention, CloudFront price class.
No NAT gateway, load balancer or second database is planned; the Terraform role is denied `ec2:CreateNatGateway`.
