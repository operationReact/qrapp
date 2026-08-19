param(
  [Parameter(Mandatory=$true)][ValidateSet("dev","prod")][string]$Environment,
  [switch]$AutoApprove
)

try {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $envDir = Join-Path $repoRoot "infra\environments\$Environment"

  Write-Host "== Terraform staged deploy: environment=$Environment (dir=$envDir) =="

  Push-Location $envDir

  Write-Host "Initializing Terraform..."
  & terraform init -input=false
  if ($LASTEXITCODE -ne 0) { throw "terraform init failed with exit code $LASTEXITCODE" }

  # Step 1: create ACM certificate resource so domain_validation_options become known
  Write-Host "Step 1: creating ACM certificate (target=module.acm.aws_acm_certificate.this)"
  $acmArgs = @('apply','-target=module.acm.aws_acm_certificate.this')
  if ($AutoApprove) { $acmArgs += '-auto-approve' }
  & terraform @acmArgs
  if ($LASTEXITCODE -ne 0) { throw "ACM targeted apply failed with exit code $LASTEXITCODE" }

  # Step 2: full apply to create validation records and the rest of infra
  Write-Host "Step 2: full apply (create records and converge remaining resources)"
  $fullArgs = @('apply')
  if ($AutoApprove) { $fullArgs += '-auto-approve' }
  & terraform @fullArgs
  if ($LASTEXITCODE -ne 0) { throw "Full terraform apply failed with exit code $LASTEXITCODE" }

  Pop-Location
  Write-Host "Terraform staged deploy completed successfully."
  exit 0
}
catch {
  Write-Error "Error: $_"
  try { Pop-Location } catch {}
  exit 1
}

