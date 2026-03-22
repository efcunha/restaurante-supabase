$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& "$scriptDir/billing-smoke-test.ps1"
& "$scriptDir/billing-audit-check.ps1"

Write-Host 'Full billing verification passed.'
