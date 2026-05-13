param(
  [switch]$OpsOnly,
  [switch]$WebOnly,
  [switch]$SiteOnly,
  [switch]$SkipOps,
  [switch]$SkipWeb,
  [switch]$SkipSite
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")

$deployOps = $true
$deployWeb = $true
$deploySite = $true

function Require-EnvVar {
  param([Parameter(Mandatory = $true)][string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required variable: $Name"
  }
}

if ($OpsOnly -or $WebOnly -or $SiteOnly) {
  $deployOps = $false
  $deployWeb = $false
  $deploySite = $false

  if ($OpsOnly) { $deployOps = $true }
  if ($WebOnly) { $deployWeb = $true }
  if ($SiteOnly) { $deploySite = $true }
}

if ($SkipOps) { $deployOps = $false }
if ($SkipWeb) { $deployWeb = $false }
if ($SkipSite) { $deploySite = $false }

Require-EnvVar -Name "RAILWAY_WORKSPACE"
Require-EnvVar -Name "RAILWAY_PROJECT"
Require-EnvVar -Name "RAILWAY_ENVIRONMENT"

if (-not $deployOps -and -not $deployWeb -and -not $deploySite) {
  throw "Nothing selected for deploy."
}

if ($deployOps) {
  Write-Host "[DEPLOY] restaurante-ops"
  Push-Location (Join-Path $RootDir "restaurante-ops")
  try {
    bash ./scripts/deploy-railway.sh
  }
  finally {
    Pop-Location
  }
}

if ($deployWeb) {
  Write-Host "[DEPLOY] restaurante-web"
  Push-Location (Join-Path $RootDir "restaurante-web")
  try {
    bash ./scripts/deploy-railway.sh
  }
  finally {
    Pop-Location
  }
}

if ($deploySite) {
  Write-Host "[DEPLOY] restaurante-site"
  Push-Location (Join-Path $RootDir "restaurante-site")
  try {
    bash ./scripts/deploy-railway.sh
  }
  finally {
    Pop-Location
  }
}

Write-Host "Deploy orchestration finished."
