$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& "$scriptDir/billing-smoke-test.ps1"
& "$scriptDir/billing-audit-check.ps1"

Write-Host ''
# Card tokenization test requires SUPABASE_ANON_KEY and a live MP sandbox; skip in CI without MP access
if (-not $env:SKIP_CARD_TEST) {
	$mpCard = if ($env:MP_TEST_CARD) { $env:MP_TEST_CARD } else { 'mastercard' }
	Write-Host "=== Running card tokenization test (MP_TEST_CARD=$mpCard) ==="
	& "$scriptDir/billing-card-test.ps1"
} else {
	Write-Host 'Card tokenization test skipped (SKIP_CARD_TEST is set).'
}

Write-Host ''
Write-Host 'Full billing verification passed.'
