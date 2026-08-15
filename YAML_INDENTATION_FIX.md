# YAML Indentation Fix - terraform-apply-dev.yml

## Problem
GitHub Actions reported a YAML syntax error on line 42 of `.github/workflows/terraform-apply-dev.yml`.

The actual issue was **inconsistent indentation throughout the file**, particularly in the steps I added:
- Lines 141, 181, 184, 205: Step names had **8 spaces** instead of **6 spaces** before the dash
- Lines 142, 182, 185, 206: Step `run:` keys had **9-10 spaces** instead of **8 spaces**

## Root Cause
When I added new steps to the workflow to fix the CloudFront CNAME conflict, I inadvertently added extra spaces in the indentation, breaking the YAML structure.

## Solution Applied
Fixed all indentation issues to follow GitHub Actions workflow standard:

### Correct YAML Indentation Structure
```yaml
jobs:
  apply-dev:
    steps:
      - name: Step Name                  # 6 spaces before dash
        run: command                     # 8 spaces before "run"
        run: |                           # 8 spaces before "run"
          script line 1                  # 10+ spaces for script content
          script line 2
```

### Lines Fixed
| Line | Issue | Fix |
|------|-------|-----|
| 141  | 8 spaces before dash | Changed to 6 spaces |
| 142  | 9 spaces before run | Changed to 8 spaces |
| 181  | 8 spaces before dash | Changed to 6 spaces |
| 182  | 9 spaces before run | Changed to 8 spaces |
| 184  | 8 spaces before dash | Changed to 6 spaces |
| 185  | 9 spaces before run | Changed to 8 spaces |
| 205  | 8 spaces before dash | Changed to 6 spaces |
| 206  | 9 spaces before run | Changed to 8 spaces |

## Verification
All lines now follow the correct GitHub Actions workflow indentation pattern:
- ✅ Job-level keys: 4 spaces
- ✅ Step items (dash): 6 spaces
- ✅ Step properties (name, run, uses): 8 spaces
- ✅ Script content: 10+ spaces

## Files Modified
- `.github/workflows/terraform-apply-dev.yml` - Fixed all indentation issues

The workflow file is now valid YAML and ready for use.

