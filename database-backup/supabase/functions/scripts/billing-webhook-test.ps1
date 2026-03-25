# billing-webhook-test.ps1
# Verifies billing-webhook HMAC-SHA256 signature authentication.
#
# Required env vars (or params):
#   SUPABASE_PROJECT_URL  - Edge Function base URL
#   WEBHOOK_SECRET        - Value of MERCADOPAGO_WEBHOOK_SECRET
#
# Optional:
#   PAYMENT_ID            - A real/sandbox MP payment id (default: "test-pay-001")
#
# Usage:
#   $env:SUPABASE_PROJECT_URL = "https://<ref>.supabase.co"
#   $env:WEBHOOK_SECRET = "<secret>"
#   .\billing-webhook-test.ps1

param(
  [string]$SupabaseProjectUrl = $env:SUPABASE_PROJECT_URL,
  [string]$WebhookSecret      = $env:WEBHOOK_SECRET,
  [string]$PaymentId          = if ($env:PAYMENT_ID) { $env:PAYMENT_ID } else { 'test-pay-001' }
)

$ErrorActionPreference = 'Stop'

if (-not $SupabaseProjectUrl) { Write-Error 'SUPABASE_PROJECT_URL is not set.'; exit 1 }
if (-not $WebhookSecret)      { Write-Error 'WEBHOOK_SECRET is not set.'; exit 1 }

if ($SupabaseProjectUrl.EndsWith('/')) { $SupabaseProjectUrl = $SupabaseProjectUrl.TrimEnd('/') }

$Url = "$SupabaseProjectUrl/functions/v1/billing-webhook"

# HMAC-SHA256 helper (pure .NET, no external tool)
function Get-Hmac256([string]$key, [string]$message) {
  $keyBytes  = [System.Text.Encoding]::UTF8.GetBytes($key)
  $msgBytes  = [System.Text.Encoding]::UTF8.GetBytes($message)
  $hmac      = New-Object System.Security.Cryptography.HMACSHA256
  $hmac.Key  = $keyBytes
  $hashBytes = $hmac.ComputeHash($msgBytes)
  return ($hashBytes | ForEach-Object { $_.ToString('x2') }) -join ''
}

$passed = 0
$failed = 0

# --- Test 1: Unsigned POST must return 401 ---------------------------------
Write-Host ''
Write-Host '--- Test 1: Unsigned POST (no x-signature header) ---'
$tmpT1 = [System.IO.Path]::GetTempFileName()
try {
  $http1 = [int](& curl.exe -sS -o $tmpT1 -w '%{http_code}' -X POST $Url `
    -H 'Content-Type: application/json' `
    -d '{"action":"payment.updated","data":{"id":"0"}}')
  Write-Host "HTTP: $http1"
  if ($http1 -eq 401) { Write-Host '  [PASS] Unsigned request rejected with 401'; $passed++ }
  else                 { Write-Host "  [FAIL] Expected 401, got $http1"; $failed++ }
} finally { Remove-Item -Force $tmpT1 -ErrorAction SilentlyContinue }

# --- Test 2: Wrong signature must return 401 ------------------------------
Write-Host ''
Write-Host '--- Test 2: Wrong signature (tampered HMAC) ---'
$tsNow   = [int][System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$badSig  = '0000000000000000000000000000000000000000000000000000000000000000'
$tmpT2   = [System.IO.Path]::GetTempFileName()
try {
  $http2 = [int](& curl.exe -sS -o $tmpT2 -w '%{http_code}' -X POST $Url `
    -H 'Content-Type: application/json' `
    -H "x-signature: ts=${tsNow},v1=${badSig}" `
    -H 'x-request-id: test-req-bad-sig' `
    -d "{`"action`":`"payment.updated`",`"data`":{`"id`":`"$PaymentId`"}}")
  Write-Host "HTTP: $http2"
  if ($http2 -eq 401) { Write-Host '  [PASS] Tampered signature rejected with 401'; $passed++ }
  else                 { Write-Host "  [FAIL] Expected 401, got $http2"; $failed++ }
} finally { Remove-Item -Force $tmpT2 -ErrorAction SilentlyContinue }

# --- Test 3: Replayed timestamp (>5 min old) must return 401 --------------
Write-Host ''
Write-Host '--- Test 3: Replayed timestamp (6 minutes ago) ---'
$tsOld     = [int][System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - 360
$reqIdOld  = 'test-req-replay'
$manifestOld = "id:${PaymentId};request-id:${reqIdOld};ts:${tsOld}"
$sigOld    = Get-Hmac256 -key $WebhookSecret -message $manifestOld
$tmpT3     = [System.IO.Path]::GetTempFileName()
try {
  $http3 = [int](& curl.exe -sS -o $tmpT3 -w '%{http_code}' -X POST $Url `
    -H 'Content-Type: application/json' `
    -H "x-signature: ts=${tsOld},v1=${sigOld}" `
    -H "x-request-id: $reqIdOld" `
    -d "{`"action`":`"payment.updated`",`"data`":{`"id`":`"$PaymentId`"}}")
  Write-Host "HTTP: $http3"
  if ($http3 -eq 401) { Write-Host '  [PASS] Replayed (stale) request rejected with 401'; $passed++ }
  else                 { Write-Host "  [FAIL] Expected 401, got $http3"; $failed++ }
} finally { Remove-Item -Force $tmpT3 -ErrorAction SilentlyContinue }

# --- Test 4: Valid signed POST (expect 200 or known downstream error) -----
Write-Host ''
Write-Host '--- Test 4: Valid HMAC signature (expect 200 or known downstream error) ---'
$tsOk     = [int][System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$reqIdOk  = "test-req-$tsOk"
$manifestOk = "id:${PaymentId};request-id:${reqIdOk};ts:${tsOk}"
$sigOk    = Get-Hmac256 -key $WebhookSecret -message $manifestOk
$tmpT4    = [System.IO.Path]::GetTempFileName()
try {
  $http4 = [int](& curl.exe -sS -o $tmpT4 -w '%{http_code}' -X POST $Url `
    -H 'Content-Type: application/json' `
    -H "x-signature: ts=${tsOk},v1=${sigOk}" `
    -H "x-request-id: $reqIdOk" `
    -d "{`"action`":`"payment.updated`",`"data`":{`"id`":`"$PaymentId`"}}")
  Write-Host "HTTP: $http4"
  Get-Content -Raw $tmpT4 | Write-Host
  Write-Host ''
  # Any non-401 means the signature layer was bypassed successfully
  if ($http4 -ne 401) { Write-Host "  [PASS] Signed request accepted (HTTP $http4 - not a signature rejection)"; $passed++ }
  else                 { Write-Host '  [FAIL] Valid signature was rejected with 401'; $failed++ }
} finally { Remove-Item -Force $tmpT4 -ErrorAction SilentlyContinue }

# --- Summary ---------------------------------------------------------------
Write-Host ''
Write-Host '==============================='
Write-Host "Webhook signature tests: PASS=$passed  FAIL=$failed"
Write-Host '==============================='

if ($failed -gt 0) { exit 1 }
