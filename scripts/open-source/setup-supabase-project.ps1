param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$DbDir,
  [switch]$ApplyMigrations,
  [switch]$SkipLink,
  [switch]$NoLogin
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")
if ([string]::IsNullOrWhiteSpace($DbDir)) {
  $DbDir = Join-Path $RootDir "database-backup/supabase"
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $Name"
  }
}

function Ask-IfEmpty {
  param(
    [string]$Current,
    [string]$Prompt
  )
  if (-not [string]::IsNullOrWhiteSpace($Current)) {
    return $Current
  }
  return (Read-Host $Prompt)
}

Require-Command -Name "supabase"

if (-not (Test-Path $DbDir)) {
  throw "Supabase directory not found: $DbDir"
}

$logged = $true
try {
  supabase projects list | Out-Null
}
catch {
  $logged = $false
}

if (-not $logged) {
  if ($NoLogin) {
    throw "Supabase session not found and -NoLogin was provided."
  }
  Write-Host "No Supabase session detected. Starting login..."
  supabase login
}

if (-not $SkipLink) {
  $ProjectRef = Ask-IfEmpty -Current $ProjectRef -Prompt "Supabase project ref"
  if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    throw "Project ref is required unless -SkipLink is used."
  }

  Push-Location $DbDir
  try {
    supabase link --project-ref $ProjectRef
  }
  finally {
    Pop-Location
  }
}

if ($ApplyMigrations) {
  Push-Location $DbDir
  try {
    supabase db push
  }
  finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "Supabase setup completed."
if (-not [string]::IsNullOrWhiteSpace($ProjectRef)) {
  Write-Host "Project ref: $ProjectRef"
}
if ($ApplyMigrations) {
  Write-Host "Migrations were applied via supabase db push."
}
