# Bro & Bro PROD — recovery procedure after partial Terraform Apply (2026-11-15)

**Current recovery status (2026-11-15 17:37 UTC):** The new-account ACM certificate
is **ISSUED**, and production OIDC Terraform role maximum session duration is
**7200 seconds** with the required IAM actions declared. Read-only AWS
verification still finds **63 tracked state instances, three untracked
existing bucket-lifecycle addresses, and one stale lock** from failed Apply
#43712225552. Do not start Terraform Apply or DNS cutover.

**Recovery plan:** Run the updated manual read-only AWS verification, which now
checks exact S3 lifecycle rule values and the failed-run lock fingerprint. Only
if the live evidence matches may the separate, explicit operator-approved
`Recover Bro and Bro PROD Terraform State (3 S3 Lifecycles)` workflow execute.
It first privately backs up the current remote state, then clears only the
verified failed-run lock and imports the three existing bucket lifecycle
configurations into Terraform state. It DOES NOT modify bucket configurations
or run Terraform Apply. If any live finding has changed, it fails before writes.

The write workflow must be dispatched from `main` with exact confirmation
`RECOVER_FAILED_PROD_STATE_43712225552`, after reviewing the read-only
diagnostic and verifying there are no active Terraform writers. **Do not
manually remove the lock or launch the repair before these checks.**

## Recorded evidence

- AWS account: `098859530205`, app region `ap-south-1`.
- Terraform backend bucket `broandbro-tfstate-098859530205-ap-south-1`, **actual bucket region `us-east-1`**.
- State key `env/prod/terraform.tfstate`; lock key `env/prod/terraform.tfstate.tflock`.
- Failed Apply: [#43712225552](https://github.com/operationReact/qrapp/actions/runs/43712225552).
- Successful read-only inventory: [#43724106576](https://github.com/operationReact/qrapp/actions/runs/43724106576).
- At least 65 addresses reported created in Apply logs. Manifest:
  `scripts/prod-apply-43712225552-completed.json`. **This is not a Terraform state file**.
- S3 state object PRESENT, two versions, **stale lock PRESENT** as of the prior
  diagnostic. Remote state contents and resource mappings were not inspected then.
- **Resolved:** CloudFormation-managed Terraform OIDC role now has a
  7200-second maximum session and the scoped permissions needed for IAM role
  reads and the RDS service-linked role.
- **Resolved:** New-account ACM certificate is ISSUED for all four domains.
  The authoritative DNS remains in the old account until a separately approved
  application cutover.

## Step 1 — update the EXISTING CloudFormation bootstrap stack (not a new stack)

1. Sign into the **new AWS account `098859530205`**, region Mumbai.
2. Open AWS CloudFormation -> Stacks. Locate the stack that owns IAM role
   `broandbro-prod-terraform-github`, and inspect its current Parameters and Resources.
3. Obtain the updated `infra/cloudformation/github-oidc-bootstrap-prod-only.yaml` from `main`.
   Update this **same stack** via an uploaded template and a **change set**.
4. **Use previous values for `CreateStateBucket` and `CreateHostedZone`. Do not blindly
   set either to `false`**. If the existing stack owns the hosted zone, changing its
   flag to false can delete the hosted zone. Never change stack name, roles or resource flags.
5. Review the change set. It should modify the existing `ProdTerraformRole` only,
   with max session 7200 seconds, `iam:ListRolePolicies`,
   `iam:ListInstanceProfilesForRole` and strictly scoped
   `iam:CreateServiceLinkedRole` for `rds.amazonaws.com`.
   **Abort if it creates/replaces IAM roles, removes a hosted zone, state bucket or changes DNS.**
6. Acknowledge `CAPABILITY_NAMED_IAM` after reviewing, execute the change set.
   Wait for `UPDATE_COMPLETE`. Confirm the role configuration in IAM.
   Do not mutate the role directly in IAM in ways that drift from CloudFormation.

## Step 2 — validate ACM using the AUTHORITATIVE DNS zone

The pending certificate is in **us-east-1**:
`arn:aws:acm:us-east-1:098859530205:certificate/5d22a443-1d74-4c5a-9bf0-4f0dc4409e71`.

1. Open AWS Certificate Manager in N. Virginia in the new account, select this certificate.
   Copy its **Domain validation** CNAME Name and Value for every unique entry.
2. Find the **currently authoritative** `broandbro.in` Route 53 hosted zone.
   Its public nameservers at last check were:
   `ns-1117.awsdns-11.org`, `ns-131.awsdns-16.com`,
   `ns-1913.awsdns-47.co.uk`, `ns-710.awsdns-24.net`.
   The new account's hosted-zone nameservers differ. Do NOT change domain nameservers.
3. Create or carefully upsert exactly the ACM CNAME validation records in the
   authoritative hosted zone. Check for any existing CNAME first to avoid conflicts.
   In the Route 53 console use fully qualified record names once, avoiding duplicated
   `broandbro.in` suffixes.
4. Verify `ISSUED` in ACM. Do not modify existing `broandbro.in`, `www`,
   frontend/API A records, or migrate customer traffic during certificate validation.

## Step 3 — inspect, preserve, then reconcile Terraform state

Run the **manual** `Verify Bro and Bro PROD AWS Access (Read Only)` workflow
from branch `main`:
https://github.com/operationReact/qrapp/actions/workflows/prod-aws-verify-readonly.yml

Its new state step reads `env/prod/terraform.tfstate` into a private temporary
file on the runner, prints **resource addresses and counts only**, and deletes the
local file. It compares tracked addresses against the 65 addresses observed in the
failed Apply. It does not expose state contents or change AWS.

An authorized operator should then:

1. Confirm no Terraform run is active and inspect the S3 lock object's owner/ID.
2. Preserve a restricted backup of the current S3 state **and all versions**; S3
   versions are an important recovery source. Do not replace the latest version
   until lineage, serial and resources in all versions are reviewed.
3. Check every address the report calls `UNTRACKED_CREATED_ADDRESS` against live
   AWS existence and actual IDs. Be aware some may have been rolled back, recreated
   or changed since the failed run; the log is not proof of current existence.
4. For each live resource missing from state, use an approved Terraform import
   procedure with the *exact matching resource address and live ID*, preserving
   module/key indexes. Do not use automated state-push without review.
5. Once state is reconciled and no Terraform process holds the lock, clear the
   stale lock using Terraform's documented procedure with the **verified matching
   lock ID**, with explicit owner review. Never force-unlock an active lock or
   delete the lock file because it is old.
6. Run `terraform plan` again using the existing backend and reconcile the
   diff. Reject unexpected adds/replacements/deletes. No Apply is authorized
   merely by passing this read-only inventory.

**Do not simply rerun the failed workflow.** Its `errored.tfstate` was written
inside the ephemeral GitHub runner and was not uploaded as an artifact; it
cannot be assumed recoverable. The remote state may not include all 65
successful resource creations.

## Step 4 — RDS and backend readiness

- Check whether the RDS service-linked IAM role exists. After Step 1's scoped
  permission update, RDS can create the service-linked role if required, but
  database creation must wait for a reconciled Terraform state.
- Verify PostgreSQL is private, deletion protection enabled, credentials
  managed by Secrets Manager, and `database/secretArn` generated.
- Run `Verify Bro and Bro PROD SSM Readiness (Read Only)` on `main`.
  Populate the seven required Razorpay/WhatsApp SecureStrings securely
  (OpenAI is optional); never copy them through GitHub issues or logs.
- Only after a reviewed Plan, explicit Apply approval and successful infra
  completion should the backend/frontend be deployed to the preview domains.
- Complete OTP, QR ordering, payment signature, invoice, database and rollback
  smoke tests **before** any production DNS cutover.

## Safety and expected costs

This recovery uses only the **one existing production environment**. Some S3,
WAF, IAM and VPC resources already exist and may incur charges. Do not create
DEV, duplicate the current bootstrap, delete old resources, or start a nightly
shutdown schedule during recovery. CloudFormation change sets and Terraform
state edits can change resources if used incorrectly; review each before
executing.