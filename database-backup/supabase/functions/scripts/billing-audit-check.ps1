param(
  [string]$SupabaseProjectUrl = $env:SUPABASE_PROJECT_URL,
  [string]$SupabaseAnonKey = $env:SUPABASE_ANON_KEY,
  [string]$UserJwt = $env:USER_JWT,
  [int]$WindowMinutes = $(if ($env:BILLING_AUDIT_WINDOW_MINUTES) { [int]$env:BILLING_AUDIT_WINDOW_MINUTES } else { 60 })
)

$ErrorActionPreference = 'Stop'

if (-not $SupabaseProjectUrl) {
  Write-Error 'SUPABASE_PROJECT_URL is not set.'
  exit 1
}

if (-not $SupabaseAnonKey) {
  Write-Error 'SUPABASE_ANON_KEY is not set.'
  exit 1
}

if (-not $UserJwt) {
  Write-Error 'USER_JWT is not set.'
  exit 1
}

if ($SupabaseProjectUrl.EndsWith('/')) {
  $SupabaseProjectUrl = $SupabaseProjectUrl.TrimEnd('/')
}

$sinceUtc = (Get-Date).ToUniversalTime().AddMinutes(-$WindowMinutes).ToString('yyyy-MM-ddTHH:mm:ssZ')
$endpoint = "$SupabaseProjectUrl/rest/v1/billing_audit_log"

$tmpBody = [System.IO.Path]::GetTempFileName()
try {
  $httpCode = & curl.exe -sS -G -o $tmpBody -w "%{http_code}" $endpoint `
    -H "apikey: $SupabaseAnonKey" `
    -H "Authorization: Bearer $UserJwt" `
    --data-urlencode "select=event_type,actor_type,created_at,details" `
    --data-urlencode "event_type=in.(billing.checkout.requested,billing.pix.requested)" `
    --data-urlencode "created_at=gte.$sinceUtc" `
    --data-urlencode "order=created_at.desc" `
    --data-urlencode "limit=50"

  $body = Get-Content -Raw $tmpBody

  Write-Host ""
  Write-Host "=== billing_audit_log check ==="
  Write-Host "HTTP: $httpCode"
  Write-Host "Window start (UTC): $sinceUtc"
  Write-Host $body

  if ([int]$httpCode -ge 400) {
    Write-Error 'Audit check failed (HTTP >= 400).'
    exit 1
  }

  $checkoutCount = ([regex]::Matches($body, 'billing\.checkout\.requested')).Count
  $pixCount = ([regex]::Matches($body, 'billing\.pix\.requested')).Count

  Write-Host "checkout.requested count: $checkoutCount"
  Write-Host "pix.requested count: $pixCount"

  if ($checkoutCount -lt 1 -or $pixCount -lt 1) {
    Write-Error 'Audit check did not find both expected events in the selected window.'
    exit 1
  }

  Write-Host 'Audit check passed.'
}
finally {
  Remove-Item -Force $tmpBody -ErrorAction SilentlyContinue
}
