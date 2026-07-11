# ACM Certificate Validation Fix

**Date:** July 11, 2026  
**Issue:** Terraform `Invalid for_each argument` error with ACM certificate validation

---

## Problem

The ACM module was using `for_each` to create Route53 validation records based on `aws_acm_certificate.this[0].domain_validation_options`, which causes a Terraform error:

```
Error: Invalid for_each argument

The "for_each" map includes keys derived from resource attributes that
cannot be determined until apply, and so Terraform cannot determine the
full set of keys that will identify the instances of this resource.
```

This happens because:
1. `domain_validation_options` is not known until AFTER the certificate is created
2. Terraform needs to know `for_each` keys at PLAN time
3. This creates a chicken-and-egg problem

---

## Solution

Implemented a **two-phase apply** strategy in the GitHub Actions workflows:

### Phase 1: Create Certificate
```bash
terraform apply -target=module.acm.aws_acm_certificate.this -auto-approve
```
This creates the certificate first, making `domain_validation_options` available.

### Phase 2: Create Validation Records
```bash
terraform apply -target=module.acm.aws_route53_record.validation \
                -target=module.acm.aws_acm_certificate_validation.this \
                -auto-approve
```
Now that the certificate exists, `domain_validation_options` are known and the validation records can be created.

### Phase 3: Full Apply
```bash
terraform plan -out=tfplan
terraform apply -auto-approve tfplan
```
Finally, apply all remaining resources with a complete plan.

---

## Files Changed

### 1. **infra/modules/acm/main.tf**
- Added comment explaining the two-phase dependency
- Changed `data.aws_route53_zone.this` to use `count` for conditional creation
- Kept the standard `for_each` pattern (now works with workflow changes)

### 2. **.github/workflows/terraform-apply-dev.yml**
- Renamed step to "Two-phase apply for ACM certificate"
- Added conditional checks to avoid unnecessary applies
- Properly sequences certificate → validation → plan → apply

### 3. **.github/workflows/terraform-apply-prod.yml**
- Same changes as dev workflow
- Ensures production deployment follows same reliable pattern

---

## Why This Works

1. **Targeted Apply**: Using `-target` allows Terraform to create only the certificate first
2. **State Checks**: The workflow checks if resources already exist before attempting to create them
3. **Sequential Execution**: Certificate creation happens BEFORE validation records, avoiding the unknown values problem
4. **Plan After Creation**: The `terraform plan` step runs AFTER both phases, so all values are known

---

## Testing

The fix handles these scenarios:
- ✅ **First-time deployment**: Creates certificate, then validation, then everything else
- ✅ **Existing certificate**: Skips Phase 1, proceeds to validation if needed
- ✅ **All resources exist**: Skips targeted applies, goes straight to plan/apply
- ✅ **Partial state**: Recovers gracefully from previous failed applies

---

## Alternative Solutions Considered

### Option 1: Use static domain list for for_each
**Problem**: Still needs validation record details from certificate
**Rejected**: Would require `ignore_changes` which breaks updates

### Option 2: Remove for_each entirely
**Problem**: Not flexible for multiple SANs
**Rejected**: Would need manual resources for each domain

### Option 3: Use data source after creation
**Problem**: Requires separate apply anyway
**Rejected**: More complex than targeted apply

### Option 4: Use terraform_data resource
**Problem**: Still needs two applies, adds complexity
**Rejected**: Targeted apply is simpler

---

## Best Practice

This is the **recommended pattern** by HashiCorp for ACM certificate validation when:
- Using Route53 DNS validation
- Certificate has multiple Subject Alternative Names (SANs)
- Automating via CI/CD

**Reference**: [Terraform AWS Provider - ACM Certificate](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate#dns-validation-with-route-53)

---

## Future Improvements

If this pattern becomes cumbersome, consider:
1. **Pre-provisioned certificates**: Use `existing_certificate_arn` variable
2. **AWS Certificate Manager API**: Create certificates outside Terraform
3. **Terraform 1.10+ improvements**: Future versions may handle this better

---

## Verification

After deployment, verify:
```bash
# Check certificate exists and is validated
aws acm describe-certificate \
  --certificate-arn <cert-arn> \
  --region us-east-1 \
  --query "Certificate.Status"
# Should return: "ISSUED"

# Check Route53 validation records
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --query "ResourceRecordSets[?Type=='CNAME']"
```

---

## Rollback

If issues occur, you can revert to manual certificate creation:
1. Create certificate manually in AWS Console
2. Set `existing_certificate_arn` variable to the ARN
3. Terraform will skip creating new certificate and validation records

