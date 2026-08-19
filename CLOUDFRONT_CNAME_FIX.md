# CloudFront CNAME Conflict Fix

## Problem
The Terraform workflow was failing with error:
```
Error: creating CloudFront Distribution: CNAMEAlreadyExists: 
One or more of the CNAMEs you provided are already associated with a different resource.
```

This occurred because:
1. An existing CloudFront distribution with CNAME `dev.broandbro.in` already existed in AWS
2. The import step wasn't finding it due to a flawed JMESPath query
3. Terraform tried to create a new distribution with the same CNAME, causing a conflict

## Root Cause
The original AWS CLI query used JMESPath with `contains()`:
```bash
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, 'dev.broandbro.in')].Id"
```

This query was unreliable and often returned no results even when matching distributions existed.

## Solution
Made two key improvements to `.github/workflows/terraform-apply-dev.yml`:

### 1. Improved CloudFront Import Logic (Lines 141-164)
Replaced the flawed JMESPath query with a more robust `jq` based approach:
```bash
# Primary search: find distribution by CNAME alias
DISTRIBUTION_ID=$(aws cloudfront list-distributions --output json 2>/dev/null | \
  jq -r '.DistributionList.Items[] | select(.Aliases.Items[]? == "dev.broandbro.in") | .Id' | \
  head -1 || true)

# Fallback search: find by comment field
if [ -z "$DISTRIBUTION_ID" ]; then
  DISTRIBUTION_ID=$(aws cloudfront list-distributions --output json 2>/dev/null | \
    jq -r '.DistributionList.Items[] | select(.Comment == "broandbro-dev-frontend") | .Id' | \
    head -1 || true)
fi
```

**Benefits:**
- Uses `jq` for more reliable JSON parsing
- Checks both CNAME alias AND comment field
- Handles cases where the distribution exists but wasn't found by first query
- Better error handling with `||true` fallbacks

### 2. Added Pre-Apply Conflict Detection (Lines 184-203)
Added a new step "Check for CNAME conflicts before apply" that runs after plan but before apply:
```bash
# Check if CloudFront is in state
CF_STATE=$(terraform state show module.cloudfront.aws_cloudfront_distribution.this 2>/dev/null || true)

if [ -z "$CF_STATE" ]; then
  # If not in state, search AWS for conflicts
  CONFLICT_ID=$(aws cloudfront list-distributions --output json 2>/dev/null | \
    jq -r '.DistributionList.Items[] | select(.Aliases.Items[]? == "dev.broandbro.in") | .Id' | \
    head -1 || true)
  
  if [ -n "$CONFLICT_ID" ]; then
    # Found conflict - attempt to import before apply
    terraform import module.cloudfront.aws_cloudfront_distribution.this "$CONFLICT_ID" || {
      echo "❌ Import failed. This likely means the distribution is managed outside Terraform."
      exit 1
    }
  fi
fi
```

**Benefits:**
- Catches CNAME conflicts before they cause apply failures
- Provides clear error messages
- Attempts one last import if the first import step missed it
- Fails fast with helpful diagnostics

## How It Works

### Before the Fix
1. ❌ CloudFront import query fails to find existing distribution
2. ❌ Plan shows CloudFront will be created
3. ❌ Apply fails with "CNAME already exists" error
4. ❌ Workflow terminates, manual intervention needed

### After the Fix
1. ✅ Improved import query finds existing CloudFront distribution
2. ✅ Imports it into Terraform state
3. ✅ Plan shows no changes needed (distribution already managed)
4. ✅ Apply succeeds without conflict
5. ✅ Workflow completes successfully

## Testing

To verify this fix works:
1. Push a change to the `dev` branch that triggers `infra/**` changes
2. Monitor the workflow execution
3. Look for successful import messages in "Import existing CloudFront distribution" step
4. Verify "Check for CNAME conflicts before apply" step also succeeds
5. Confirm apply completes without CNAME errors

## Related Steps

The following steps also import orphaned resources to prevent similar conflicts:
- S3 frontend bucket (line 93)
- EC2 key pair (line 105)
- Shared media bucket (line 121)
- RDS instance (line 166)

The CloudFront fix follows the same pattern but with enhanced detection logic due to the complexity of finding distributions by alias.

## Notes

- The workflow requires `jq` to be available on the runner (included in ubuntu-latest)
- If import fails (e.g., distribution managed outside Terraform), the workflow exits with helpful error message
- The pre-apply conflict check provides a safety net in case earlier import steps missed the distribution

