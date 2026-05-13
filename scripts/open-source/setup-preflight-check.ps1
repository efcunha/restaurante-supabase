param(
  [switch]$StrictDeploy
)

$ErrorActionPreference = "Stop"
$HasErrors = $false

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")

function Ok([string]$Message) {
  Write-Host "[OK] $Message"
}

function Warn([string]$Message) {
  Write-Host "[WARN] $Message"
}

function Err([string]$Message) {
  Write-Host "[ERROR] $Message"
  $script:HasErrors = $true
}

function Test-CommandAvailability {
  param(
    [string]$Name,
    [string]$Label,
    [bool]$Required
  )

  if (Get-Command $Name -ErrorAction SilentlyContinue) {
    Ok "$Label found"
  }
  else {
    if ($Required) {
      Err "$Label missing"
    }
    else {
      Warn "$Label missing"
      if ($StrictDeploy) {
        Err "$Label is required in -StrictDeploy mode"
      }
    }
  }
}

function Test-FilePresence {
  param(
    [string]$Path,
    [bool]$Required
  )

  if (Test-Path $Path) {
    Ok "File present: $Path"
  }
  else {
    if ($Required) {
      Err "Missing file: $Path"
    }
    else {
      Warn "Missing file: $Path"
    }
  }
}

function Test-EnvironmentVariable {
  param(
    [string]$Name,
    [bool]$Required
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    Ok "Env set: $Name"
  }
  else {
    if ($Required) {
      Err "Missing env: $Name"
    }
    else {
      Warn "Missing env: $Name"
    }
  }
}

Write-Host "== Tooling checks =="
Test-CommandAvailability -Name "node" -Label "Node.js" -Required $true
Test-CommandAvailability -Name "pnpm" -Label "pnpm" -Required $true
Test-CommandAvailability -Name "git" -Label "Git" -Required $true
Test-CommandAvailability -Name "railway" -Label "Railway CLI" -Required $false
Test-CommandAvailability -Name "supabase" -Label "Supabase CLI" -Required $false
Test-CommandAvailability -Name "eas" -Label "EAS CLI" -Required $false

Write-Host ""
Write-Host "== Environment file checks =="
Test-FilePresence -Path (Join-Path $RootDir "restaurante-app/.env.example") -Required $true
Test-FilePresence -Path (Join-Path $RootDir "restaurante-web/.env.example") -Required $true
Test-FilePresence -Path (Join-Path $RootDir "restaurante-ops/.env.example") -Required $true
Test-FilePresence -Path (Join-Path $RootDir "restaurante-site/.env.example") -Required $true
Test-FilePresence -Path (Join-Path $RootDir "database-backup/.env.example") -Required $true

Test-FilePresence -Path (Join-Path $RootDir "restaurante-app/.env.local") -Required $false
Test-FilePresence -Path (Join-Path $RootDir "restaurante-web/.env.local") -Required $false
Test-FilePresence -Path (Join-Path $RootDir "restaurante-ops/.env.local") -Required $false
Test-FilePresence -Path (Join-Path $RootDir "restaurante-site/.env.local") -Required $false
Test-FilePresence -Path (Join-Path $RootDir "database-backup/.env.local") -Required $false

Write-Host ""
Write-Host "== Deploy environment checks =="
if ($StrictDeploy) {
  Test-EnvironmentVariable -Name "RAILWAY_WORKSPACE" -Required $true
  Test-EnvironmentVariable -Name "RAILWAY_PROJECT" -Required $true
  Test-EnvironmentVariable -Name "RAILWAY_ENVIRONMENT" -Required $true
}
else {
  Test-EnvironmentVariable -Name "RAILWAY_WORKSPACE" -Required $false
  Test-EnvironmentVariable -Name "RAILWAY_PROJECT" -Required $false
  Test-EnvironmentVariable -Name "RAILWAY_ENVIRONMENT" -Required $false
}

if ($HasErrors) {
  Write-Host ""
  throw "Preflight finished with errors."
}

Write-Host ""
Write-Host "Preflight passed."
