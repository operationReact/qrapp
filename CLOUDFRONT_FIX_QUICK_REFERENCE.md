# Quick Summary: CloudFront CNAME Fix

## Problem
CloudFront creation fails with `CNAMEAlreadyExists` error when:
- Distribution with alias already exists in AWS
- But not yet in Terraform state
- Workflow tries to create it again

## Solution
**Import the CloudFront distribution BEFORE terraform plan**

## Key Changes

### terraform-apply-dev.yml
**New step before Terraform Plan:**
```yaml
- name: Import existing CloudFront distribution (if orphaned)
  shell: bash
  run: |
    set -euo pipefail
    # Search AWS for distribution with alias "dev.broandbro.in"
    # If found, import it into Terraform state
    # If in state already, skip
    # If not found anywhere, Terraform will create it
```

**Removed:**
- Old "Final CNAME conflict check" step (was checking too late)

**Why it works:**
- Uses `jq -r '.DistributionList.Items[] | select(.Aliases.Items[]? == "dev.broandbro.in")'`
- The `.Aliases.Items[]?` searches ALL aliases, not just first
- Import happens before plan, so Terraform knows about it

### terraform-apply-prod.yml
**Same approach**, but searches for BOTH aliases:
- `broandbro.in` OR `www.broandbro.in`

## The Critical Fix
### BEFORE (Wrong - only checked first alias):
```bash
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,Aliases.Items[0]]'
#                                                                             ^^^ ONLY FIRST!
```

### AFTER (Correct - checks all aliases):
```bash
aws cloudfront list-distributions --output json | \
  jq -r '.DistributionList.Items[] | select(.Aliases.Items[]? == "dev.broandbro.in") | .Id'
#                                           ^^^^^^^^^^^^^^ CHECKS ALL ALIASES
```

## Workflow Execution Order
1. Checkout → Setup → Init → Validate (unchanged)
2. ★ NEW: **Import CloudFront** ← Import BEFORE plan
3. Terraform Plan ← Now safe, no CNAME conflicts
4. Terraform Apply

## Why This is Better

| Problem | Before | After |
|---------|--------|-------|
| CNAME already exists | ❌ Fails during plan | ✓ Imports it first |
| Multiple aliases | ❌ Only checks first | ✓ Checks all |
| Duplicate code | ❌ Import in 2 places | ✓ 1 consolidated step |
| Idempotent | ❌ Risky | ✓ Safe to re-run |

## Testing Your Fix
1. Push to dev/main branch
2. GitHub Actions runs workflow
3. Look for step: "Import existing CloudFront distribution (if orphaned)"
4. Should see one of:
   - "✓ CloudFront already in Terraform state - skipping import" (already managed)
   - "Found existing distribution: E1234ABCD..." (importing now)
   - "✓ No existing CloudFront...found - will create new" (clean deploy)
5. Continue normally to Plan and Apply

## If Something Goes Wrong
1. **Import fails**: Check AWS IAM permissions (cloudfront:ListDistributions)
2. **Plan shows weird changes**: Distribution existed but differed from Terraform code - apply to reconcile
3. **Still get CNAME error**: Check CloudFront distribution details in AWS Console - is the alias really there?

## Files Changed
- `.github/workflows/terraform-apply-dev.yml` - 212 lines (consolidated, cleaner)
- `.github/workflows/terraform-apply-prod.yml` - 194 lines (same pattern)

Both validated with YAML parser ✓

