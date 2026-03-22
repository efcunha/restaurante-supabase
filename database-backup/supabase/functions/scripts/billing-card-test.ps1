# =============================================================================
# billing-card-test.ps1
# Full card tokenization smoke test using Mercado Pago test cards.
#
# Flow:
#   1. Call billing-create-checkout (Mode A) -> get publicKey
#   2. Call MP /v1/card_tokens with test card data -> get cardToken
#   3. Call billing-create-checkout (Mode B) with cardToken -> card saved
#   4. Verify payment_methods table via REST
#
# Required env vars (or parameters):
#   SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, USER_JWT
#
# Optional:
#   MP_TEST_CARD  -- mastercard (default) | visa | amex | elo
# =============================================================================
param(
  [string]$SupabaseProjectUrl = $env:SUPABASE_PROJECT_URL,
  [string]$SupabaseAnonKey    = $env:SUPABASE_ANON_KEY,
  [string]$UserJwt            = $env:USER_JWT,
  [string]$MpTestCard         = ($env:MP_TEST_CARD ?? 'mastercard'),
  [string]$MpApiBase          = ($env:MERCADOPAGO_API_BASE_URL ?? 'https://api.mercadopago.com')
)

$ErrorActionPreference = 'Stop'

if (-not $SupabaseProjectUrl) { Write-Error 'SUPABASE_PROJECT_URL is not set.'; exit 1 }
if (-not $SupabaseAnonKey)    { Write-Error 'SUPABASE_ANON_KEY is not set.';    exit 1 }
if (-not $UserJwt)            { Write-Error 'USER_JWT is not set.';              exit 1 }

$SupabaseProjectUrl = $SupabaseProjectUrl.TrimEnd('/')

# ---------------------------------------------------------------------------
# Test card definitions (Mercado Pago sandbox)
# https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards
# ---------------------------------------------------------------------------
$Cards = @{
  mastercard = @{ Number = '5031433215406351'; Cvv = '123';  Month = 11; Year = 2030; Holder = 'APRO CUSTOMER' }
  visa       = @{ Number = '4235647728025682'; Cvv = '123';  Month = 11; Year = 2030; Holder = 'APRO CUSTOMER' }
  amex       = @{ Number = '375365153556885';  Cvv = '1234'; Month = 11; Year = 2030; Holder = 'APRO CUSTOMER' }
  elo        = @{ Number = '5067766783888311'; Cvv = '123';  Month = 11; Year = 2030; Holder = 'APRO CUSTOMER' }
}

if (-not $Cards.ContainsKey($MpTestCard)) {
  Write-Error "MP_TEST_CARD must be one of: mastercard | visa | amex | elo"
  exit 1
}

$Card = $Cards[$MpTestCard]
$Pass = 0
$Fail = 0

function Step-Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green;  $script:Pass++ }
function Step-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red;    $script:Fail++ }

function Invoke-Json {
  param([string]$Url, [hashtable]$Headers, [string]$Body = $null, [string]$Method = 'POST')
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    $args = @('-sS', '-o', $tmp, '-w', '%{http_code}', '-X', $Method, $Url)
    foreach ($k in $Headers.Keys) { $args += @('-H', "$k`: $($Headers[$k])") }
    if ($Body) { $args += @('-H', 'Content-Type: application/json', '-d', $Body) }
    $http = & curl.exe @args
    $content = Get-Content -Raw $tmp
    return @{ Http = [int]$http; Body = $content; Json = ($content | ConvertFrom-Json -ErrorAction SilentlyContinue) }
  } finally { Remove-Item -Force $tmp -ErrorAction SilentlyContinue }
}

function Invoke-JsonGet {
  param([string]$Url, [hashtable]$Headers, [hashtable]$Params)
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    $args = @('-sS', '-o', $tmp, '-w', '%{http_code}', '-G', $Url)
    foreach ($k in $Headers.Keys) { $args += @('-H', "$k`: $($Headers[$k])") }
    foreach ($k in $Params.Keys)  { $args += @('--data-urlencode', "$k=$($Params[$k])") }
    $http = & curl.exe @args
    $content = Get-Content -Raw $tmp
    return @{ Http = [int]$http; Body = $content; Json = ($content | ConvertFrom-Json -ErrorAction SilentlyContinue) }
  } finally { Remove-Item -Force $tmp -ErrorAction SilentlyContinue }
}

$AuthHeaders = @{
  'Authorization' = "Bearer $UserJwt"
}

# ---------------------------------------------------------------------------
# STEP 1 — Get public key from billing-create-checkout (Mode A)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== STEP 1: billing-create-checkout (Mode A — get publicKey) ===" -ForegroundColor Cyan

$r1 = Invoke-Json -Url "$SupabaseProjectUrl/functions/v1/billing-create-checkout" -Headers $AuthHeaders -Body '{}'
Write-Host "HTTP: $($r1.Http)"
Write-Host $r1.Body
Write-Host ""

if ($r1.Http -eq 200) {
  $checkoutStatus = $r1.Json.status
  $publicKey = $r1.Json.publicKey

  if ($checkoutStatus -eq 'ready_for_tokenization' -and $publicKey) {
    Step-Pass "Mode A returned status=ready_for_tokenization with publicKey"
  } elseif ($checkoutStatus -eq 'provider_not_ready') {
    Step-Fail "Provider not ready — configure MERCADOPAGO_PUBLIC_KEY and MERCADOPAGO_ACCESS_TOKEN"
    exit 1
  } else {
    Step-Fail "Unexpected status: $checkoutStatus"
    exit 1
  }
} else {
  Step-Fail "billing-create-checkout returned HTTP $($r1.Http)"
  exit 1
}

# ---------------------------------------------------------------------------
# STEP 2 — Tokenize test card directly with Mercado Pago
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== STEP 2: Tokenize $MpTestCard test card with MP /v1/card_tokens ===" -ForegroundColor Cyan

$tokenPayload = @{
  card_number       = $Card.Number
  expiration_month  = $Card.Month
  expiration_year   = $Card.Year
  security_code     = $Card.Cvv
  cardholder        = @{ name = $Card.Holder }
} | ConvertTo-Json -Depth 3

$tokenHeaders = @{ 'Authorization' = "Bearer $publicKey" }
$r2 = Invoke-Json -Url "$MpApiBase/v1/card_tokens" -Headers $tokenHeaders -Body $tokenPayload
Write-Host "HTTP: $($r2.Http)"
Write-Host $r2.Body
Write-Host ""

if ($r2.Http -in 200, 201) {
  $cardToken = $r2.Json.id
  if ($cardToken) {
    Step-Pass "card_tokens returned token: $($cardToken.Substring(0, [Math]::Min(12, $cardToken.Length)))..."
  } else {
    Step-Fail "card_tokens did not return an id"
    exit 1
  }
} else {
  $errMsg = $r2.Json.message ?? ''
  Step-Fail "MP card_tokens returned HTTP $($r2.Http): $errMsg"
  exit 1
}

# ---------------------------------------------------------------------------
# STEP 3 — Save card token via billing-create-checkout (Mode B)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== STEP 3: billing-create-checkout (Mode B — save card token) ===" -ForegroundColor Cyan

$savePayload = "{`"cardToken`": `"$cardToken`"}"
$r3 = Invoke-Json -Url "$SupabaseProjectUrl/functions/v1/billing-create-checkout" -Headers $AuthHeaders -Body $savePayload
Write-Host "HTTP: $($r3.Http)"
Write-Host $r3.Body
Write-Host ""

if ($r3.Http -eq 201) {
  $saveStatus  = $r3.Json.status
  $pmId        = $r3.Json.paymentMethodId
  $cardBrand   = $r3.Json.card.brand
  $cardLastFour= $r3.Json.card.lastFour

  if ($saveStatus -eq 'card_saved' -and $pmId) {
    Step-Pass "card_saved: brand=$cardBrand lastFour=$cardLastFour paymentMethodId=$pmId"
  } else {
    Step-Fail "Expected status=card_saved, got: $saveStatus"
  }
} else {
  $errMsg = $r3.Json.error ?? ''
  Step-Fail "billing-create-checkout Mode B returned HTTP $($r3.Http): $errMsg"
  exit 1
}

# ---------------------------------------------------------------------------
# STEP 4 — Verify payment_methods row via Supabase REST
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== STEP 4: Verify payment_methods row via REST ===" -ForegroundColor Cyan

$restHeaders = @{
  'apikey'        = $SupabaseAnonKey
  'Authorization' = "Bearer $UserJwt"
}
$r4 = Invoke-JsonGet -Url "$SupabaseProjectUrl/rest/v1/payment_methods" -Headers $restHeaders -Params @{
  'id'     = "eq.$pmId"
  'select' = 'id,type,brand,last_four,expiry_month,expiry_year,is_default,mp_card_id'
}
Write-Host "HTTP: $($r4.Http)"
Write-Host $r4.Body
Write-Host ""

if ($r4.Http -eq 200) {
  $rows = @($r4.Json)
  if ($rows.Count -ge 1) {
    $row = $rows[0]
    $mpCardIdShort = if ($row.mp_card_id) { $row.mp_card_id.Substring(0, [Math]::Min(8, $row.mp_card_id.Length)) + '...' } else { '(none)' }
    Step-Pass "payment_methods row found: brand=$($row.brand) is_default=$($row.is_default) mp_card_id=$mpCardIdShort"
  } else {
    Step-Fail "payment_methods row not found for id=$pmId"
  }
} else {
  Step-Fail "REST query returned HTTP $($r4.Http)"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  PASS: $Pass  |  FAIL: $Fail" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

if ($Fail -ne 0) {
  Write-Error "Card tokenization test FAILED for $MpTestCard."
  exit 1
}

Write-Host "Card tokenization test passed for $MpTestCard." -ForegroundColor Green
