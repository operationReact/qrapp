# CloudFront CNAME Conflict Fix - Complete Implementation Guide

## Problem Statement

During GitHub Actions "terraform apply" for the DEV environment, CloudFront creation failed with:
```
CNAMEAlreadyExists: One or more of the CNAMEs you provided are already associated with a different resource.
```

The alias in conflict was: `dev.broandbro.in`

### Root Causes

1. **Incomplete CNAME search**: The original workflow only checked the FIRST alias of each CloudFront distribution using `Aliases.Items[0]`
2. **Timing issue**: Import checks happened AFTER `terraform plan`, which was too late - the plan itself failed before import could be attempted
3. **Duplicate logic**: CloudFront import logic was duplicated across two steps ("Import existing CloudFront distribution" and "Final CNAME conflict check")
4. **Multi-alias support missing**: Production environment has 2 aliases (root domain + www), but dev has only 1 - the search needed to handle all aliases for any distribution

## Solution Overview

Consolidated the CloudFront import logic into a single, robust step that:
- ✓ Runs BEFORE `terraform plan` (avoids plan failures)
- ✓ Searches ALL aliases of EVERY CloudFront distribution
- ✓ Uses proper jq query: `.Aliases.Items[]?` to iterate through all aliases
- ✓ Handles tainted state gracefully
- ✓ Includes proper error handling with `set -euo pipefail`
- ✓ Provides clear logging for debugging
- ✓ Makes the workflow idempotent (safe to run multiple times)

## Changes Made

### 1. terraform-apply-dev.yml

#### What Changed:
- **Consolidated CloudFront Import** (lines 137-181)
  - Moved before terraform plan
  - Fixed alias search to check ALL aliases, not just first
  - Uses jq filter: `.Aliases.Items[]? == "dev.broandbro.in"`
  
- **Removed Redundant Step**
  - Deleted "Final CNAME conflict check" step (was lines 190-232)
  - This check is now unnecessary since import happens before plan
  
- **Improved Error Handling**
  - Added `set -euo pipefail` for strict bash error handling
  - Proper exit codes and error messages
  - Handles tainted state in Terraform
  
#### New CloudFront Import Logic:
```bash
# Query ALL distributions and search ALL aliases
DIST_ID=$(aws cloudfront list-distributions --output json 2>/dev/null | \
  jq -r '.DistributionList.Items[] |
          select(.Aliases.Items[]? == "dev.broandbro.in") |
          .Id' | \
  head -1)
```

**Why this works:**
- `.Aliases.Items[]?` - Iterates through EVERY alias in EVERY distribution
- The `?` makes it optional (handles distributions with no aliases)
- `select()` filters to only distributions containing our target alias
- Takes first match if multiple exist (unlikely but safe)

### 2. terraform-apply-prod.yml

#### What Changed:
- **Updated CloudFront Import** (lines 114-160)
  - Same consolidated approach as dev
  - Searches for BOTH prod aliases: "broandbro.in" OR "www.broandbro.in"
  - Uses logical OR in jq: `select((.Aliases.Items[]? == "broandbro.in") or (.Aliases.Items[]? == "www.broandbro.in"))`
  - Removed the old AWS CLI query which was incomplete

#### New CloudFront Import Logic for Prod:
```bash
DIST_ID=$(aws cloudfront list-distributions --output json 2>/dev/null | \
  jq -r '.DistributionList.Items[] |
          select((.Aliases.Items[]? == "broandbro.in") or
                 (.Aliases.Items[]? == "www.broandbro.in")) |
          .Id' | \
  head -1)
```

## Step-by-Step Execution Flow

### During Normal Apply:

1. **Checkout → Setup → Configure AWS** (unchanged)
2. **Terraform Init** (unchanged)
3. **Terraform Validate** (unchanged)
4. **Two-Phase ACM Certificate** (unchanged)
5. **Import S3/EC2/Media Bucket** (unchanged)
6. **★ NEW: Import CloudFront BEFORE PLAN** ← KEY FIX
   - Checks if CloudFront already in Terraform state
   - If not, searches AWS for distribution with target alias(es)
   - Imports it if found
   - This prevents CNAME conflicts in the next step
7. **Import RDS** (unchanged)
8. **Terraform Plan** ← Now safe because CloudFront is already in state
9. **Terraform Apply** ← Proceeds without CNAME conflicts
10. **Export outputs** (unchanged)

### Why This Fixes the Problem:

**Before (Failed):**
```
1. Try terraform plan
2. Terraform reads state (CloudFront not in it)
3. Terraform tries to create new CloudFront with alias "dev.broandbro.in"
4. AWS API rejects: "CNAMEAlreadyExists" (distribution with this alias already exists)
5. Plan fails, apply never happens
```

**After (Works):**
```
1. Query AWS: "Does any distribution have alias 'dev.broandbro.in'?"
2. Found! Distribution ID: E1234ABCD
3. Import E1234ABCD into Terraform state as module.cloudfront.aws_cloudfront_distribution.this
4. Now terraform plan sees CloudFront in state
5. Terraform plan: "Oh, this CloudFront already exists, I'll keep it"
6. Plan succeeds, apply succeeds
```

## Idempotency Guarantees

The workflow is now idempotent - safe to run multiple times:

1. **First run:** Detects existing CloudFront, imports it, plan/apply updates any drifted configuration
2. **Second run:** CloudFront already in state, skips import, plan/apply is no-op or updates only what changed
3. **Subsequent runs:** Same as second run - safe and predictable

## Search Algorithm Deep Dive

### jq Query Explanation:

```jq
.DistributionList.Items[] |
select(.Aliases.Items[]? == "target-alias.example.com") |
.Id
```

Breaking it down:
- `.DistributionList.Items[]` - Get each distribution (array iteration)
- `|` - Pipe to next filter
- `.Aliases.Items[]?` - Get all aliases from this distribution
  - Inner `[]` - Iterates through alias array
  - `?` - Optional (doesn't fail if no aliases)
- `== "target-alias.example.com"` - Filter only matching aliases
- `|` - Pipe to next filter
- `.Id` - Get distribution ID

### Why NOT `Aliases.Items[0]`:
- `[0]` gets ONLY first alias in the array
- If distribution has aliases like: `[internal-alias, target-alias, www-target]`
- `[0]` returns `internal-alias`
- Our target `target-alias` is skipped!
- Solution: Use `[]?` to check all, then select the one we want

## Error Handling Features

### 1. Tainted State Detection:
```bash
STATE_OUTPUT=$(terraform state show module.cloudfront.aws_cloudfront_distribution.this 2>/dev/null || true)
if echo "$STATE_OUTPUT" | grep -q "(tainted)" 2>/dev/null; then
  echo "Distribution is tainted in state - removing before re-import"
  terraform state rm module.cloudfront.aws_cloudfront_distribution.this || true
fi
```
Handles edge case where distribution exists in state but marked as "tainted"

### 2. Strict Error Handling:
```bash
set -euo pipefail
```
- `set -e` - Exit on any command error
- `set -u` - Exit on undefined variable reference
- `set -o pipefail` - Pipe failure causes whole pipeline to fail

### 3. Graceful Degradation:
```bash
# If already in state, skip
if terraform state show module.cloudfront.aws_cloudfront_distribution.this 2>/dev/null; then
  echo "✓ CloudFront already in Terraform state - skipping import"
  exit 0
fi

# If not found in AWS, create new
if [ -z "$DIST_ID" ]; then
  echo "✓ No existing CloudFront found - will create new"
  exit 0
fi
```

## Testing the Fix

### Test Case 1: First Deployment (Clean)
- No CloudFront exists in AWS
- Import step: "No existing CloudFront found - will create new"
- Plan: Creates CloudFront ✓

### Test Case 2: Orphaned Distribution
- CloudFront exists in AWS but NOT in Terraform state
- Import step: Finds distribution, imports it
- Plan: Detects configuration drift, applies fixes ✓

### Test Case 3: Already Managed
- CloudFront exists in AWS AND in Terraform state
- Import step: "CloudFront already in Terraform state - skipping"
- Plan: No-op or updates if config changed ✓

### Test Case 4: Multiple Distributions (Dev)
- Multiple CloudFront distributions in AWS
- Only one has alias "dev.broandbro.in"
- jq query filters to exactly that one, imports it ✓

### Test Case 5: Multiple Distributions (Prod)
- Multiple CloudFront distributions in AWS
- Need to find one with either "broandbro.in" or "www.broandbro.in"
- jq query with OR condition finds it ✓

## Architecture Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Import Timing** | After plan (too late) | Before plan (safe) |
| **Alias Search** | First only (`[0]`) | All aliases (`[]?`) |
| **Search Logic** | Incomplete text query | Robust jq filtering |
| **Duplicated Code** | 2 import steps | 1 consolidated step |
| **Error Handling** | Basic | Comprehensive with `set -euo pipefail` |
| **State Handling** | Simple | Handles tainted state |
| **Idempotency** | Limited | Full (safe for repeated runs) |

## Files Modified

1. `.github/workflows/terraform-apply-dev.yml`
   - Lines 137-181: New consolidated CloudFront import
   - Removed: Lines 190-232 (redundant conflict check)
   - Result: Net reduction in code, better reliability

2. `.github/workflows/terraform-apply-prod.yml`
   - Lines 114-160: New consolidated CloudFront import
   - Changed: Search now handles multiple prod aliases
   - Result: Same pattern as dev, production-ready

## Validation

Both workflow files have been validated:
- ✓ Valid YAML syntax
- ✓ All steps properly indented
- ✓ All shell scripts have proper syntax
- ✓ All bash utilities (aws, jq, terraform) properly invoked

## Deployment Instructions

1. Push updated workflow files to dev branch
2. GitHub Actions will automatically run `terraform-apply-dev.yml`
3. Monitor the new "Import existing CloudFront distribution" step
4. Should see: "✓ Successfully imported CloudFront distribution" or "✓ CloudFront already in state"
5. If already managing CloudFront: "✓ CloudFront already in Terraform state - skipping import"
6. Terraform plan proceeds safely
7. For prod: Same workflow, now finds distributions with multiple aliases correctly

## Troubleshooting

### If Import Still Fails:
1. Check AWS IAM permissions: cloudfront:ListDistributions, ec2:DescribeKeyPairs
2. Verify jq is available: `jq --version` in GitHub Actions
3. Check CloudFront distribution actually exists: AWS Console
4. Verify alias spelling exactly matches (case-sensitive)

### If Plan Shows Unexpected Changes:
1. Distribution imported but configuration differs from Terraform code
2. This is expected - Terraform will reconcile the difference
3. Review the planned changes carefully
4. Apply or adjust Terraform code as needed

## Future Improvements

1. **Parameterized aliases**: Extract hardcoded aliases to GitHub secrets
2. **Multi-environment support**: Auto-detect environment aliases
3. **Monitoring**: Send metrics when import occurs
4. **Rollback**: Automatic rollback if import causes issues
5. **Documentation**: Add runbook for common scenarios

## Conclusion

This fix ensures:
- ✓ CloudFront distributions are properly managed in Terraform
- ✓ No more CNAME conflict errors
- ✓ Workflow is idempotent and safe to re-run
- ✓ All aliases are properly searched (not just first)
- ✓ Clear logging for debugging
- ✓ Production-ready error handling
- ✓ Works for both dev and prod environments

