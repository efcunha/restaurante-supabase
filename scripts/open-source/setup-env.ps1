param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")

function Copy-ExampleFile {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target
  )

  if (-not (Test-Path $Source)) {
    Write-Host "[SKIP] Example file not found: $Source"
    return
  }

  if ((Test-Path $Target) -and (-not $Force)) {
    Write-Host "[SKIP] Existing file preserved: $Target"
    return
  }

  Copy-Item -Path $Source -Destination $Target -Force
  Write-Host "[OK] Created: $Target"
}

Write-Host "Preparing local env files from safe templates..."

Copy-ExampleFile -Source (Join-Path $RootDir "restaurante-app/.env.example") -Target (Join-Path $RootDir "restaurante-app/.env.local")
Copy-ExampleFile -Source (Join-Path $RootDir "restaurante-web/.env.example") -Target (Join-Path $RootDir "restaurante-web/.env.local")
Copy-ExampleFile -Source (Join-Path $RootDir "restaurante-ops/.env.example") -Target (Join-Path $RootDir "restaurante-ops/.env.local")
Copy-ExampleFile -Source (Join-Path $RootDir "restaurante-site/.env.example") -Target (Join-Path $RootDir "restaurante-site/.env.local")
Copy-ExampleFile -Source (Join-Path $RootDir "database-backup/.env.example") -Target (Join-Path $RootDir "database-backup/.env.local")
Copy-ExampleFile -Source (Join-Path $RootDir "balanca-bridge/.env.example") -Target (Join-Path $RootDir "balanca-bridge/.env.local")

Write-Host ""
Write-Host "Next steps:"
Write-Host "1) Edit each .env.local and fill with your own credentials."
Write-Host "2) Never commit .env.local files."
Write-Host "3) Configure Railway variables before running deploy scripts."
Write-Host ""
Write-Host "Required Railway variables:"
Write-Host "  RAILWAY_WORKSPACE"
Write-Host "  RAILWAY_PROJECT"
Write-Host "  RAILWAY_ENVIRONMENT"
