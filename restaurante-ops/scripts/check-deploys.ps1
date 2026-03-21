$ErrorActionPreference = "Continue"
Remove-Item Env:RAILWAY_TOKEN -ErrorAction SilentlyContinue

Set-Location "D:\restaurante-supabase\restaurante-ops"

Write-Host "=== Status dos deployments (restaurante-web linkado) ===" -ForegroundColor Yellow
$json = railway deployment list --json 2>&1
$deploys = $json | ConvertFrom-Json
$deploys | Select-Object -First 5 | ForEach-Object {
    Write-Host ("ID: " + $_.id + " | Status: " + $_.status + " | " + $_.createdAt)
}
