param(
  [string]$Workspace = $env:RAILWAY_WORKSPACE,
  [string]$Project = $env:RAILWAY_PROJECT,
  [string]$Environment = $env:RAILWAY_ENVIRONMENT,
  [string]$Service = $env:RAILWAY_SERVICE,
  [switch]$NoLogin
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")

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

Require-Command -Name "railway"

$Workspace = Ask-IfEmpty -Current $Workspace -Prompt "Railway workspace"
$Project = Ask-IfEmpty -Current $Project -Prompt "Railway project"
$Environment = Ask-IfEmpty -Current $Environment -Prompt "Railway environment"

if ([string]::IsNullOrWhiteSpace($Workspace) -or [string]::IsNullOrWhiteSpace($Project) -or [string]::IsNullOrWhiteSpace($Environment)) {
  throw "Workspace, project and environment are required."
}

$logged = $true
try {
  railway whoami | Out-Null
}
catch {
  $logged = $false
}

if (-not $logged) {
  if ($NoLogin) {
    throw "Railway session not found and -NoLogin was provided."
  }
  Write-Host "No Railway session detected. Starting login..."
  railway login
}

Push-Location $RootDir
try {
  $args = @(
    "link",
    "--workspace", $Workspace,
    "--project", $Project,
    "--environment", $Environment
  )

  if (-not [string]::IsNullOrWhiteSpace($Service)) {
    $args += @("--service", $Service)
  }

  railway @args
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "Railway link completed."
Write-Host "Recommended environment exports for current shell:"
Write-Host "  `$env:RAILWAY_WORKSPACE = \"$Workspace\""
Write-Host "  `$env:RAILWAY_PROJECT = \"$Project\""
Write-Host "  `$env:RAILWAY_ENVIRONMENT = \"$Environment\""
if (-not [string]::IsNullOrWhiteSpace($Service)) {
  Write-Host "  `$env:RAILWAY_SERVICE = \"$Service\""
}
