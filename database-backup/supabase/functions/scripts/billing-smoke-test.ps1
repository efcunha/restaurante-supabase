param(
  [string]$SupabaseProjectUrl = $env:SUPABASE_PROJECT_URL,
  [string]$UserJwt = $env:USER_JWT
)

$ErrorActionPreference = 'Stop'

if (-not $SupabaseProjectUrl) {
  Write-Error 'SUPABASE_PROJECT_URL is not set.'
  exit 1
}

if (-not $UserJwt) {
  Write-Error 'USER_JWT is not set.'
  exit 1
}

if ($SupabaseProjectUrl.EndsWith('/')) {
  $SupabaseProjectUrl = $SupabaseProjectUrl.TrimEnd('/')
}

function Invoke-BillingFunction {
  param(
    [Parameter(Mandatory = $true)][string]$FunctionName,
    [Parameter(Mandatory = $true)][string]$Payload
  )

  $tmpBody = [System.IO.Path]::GetTempFileName()
  try {
    $httpCode = & curl.exe -sS -o $tmpBody -w "%{http_code}" `
      "$SupabaseProjectUrl/functions/v1/$FunctionName" `
      -H "Authorization: Bearer $UserJwt" `
      -H "Content-Type: application/json" `
      -d $Payload

    Write-Host ""
    Write-Host "=== $FunctionName ==="
    Write-Host "HTTP: $httpCode"
    Get-Content -Raw $tmpBody | Write-Host

    return [int]$httpCode
  }
  finally {
    Remove-Item -Force $tmpBody -ErrorAction SilentlyContinue
  }
}

$failed = $false
$functionNames = @(
  'billing-provider-status',
  'billing-create-checkout',
  'billing-create-pix-fallback'
)

foreach ($fn in $functionNames) {
  $statusCode = Invoke-BillingFunction -FunctionName $fn -Payload '{}'
  if ($statusCode -ge 400) {
    $failed = $true
  }
}

# billing-webhook: an unsigned POST must return 401 (signature missing)
Write-Host ''
Write-Host '=== billing-webhook (unsigned POST --- expect 401) ==='
$tmpWh = [System.IO.Path]::GetTempFileName()
try {
  $httpWh = [int](& curl.exe -sS -o $tmpWh -w '%{http_code}' -X POST `
    -H 'Content-Type: application/json' `
    -d '{"action":"payment.updated","data":{"id":"0"}}' `
    "$SupabaseProjectUrl/functions/v1/billing-webhook")
  Write-Host "HTTP: $httpWh"
  if ($httpWh -eq 401) {
    Write-Host '  [PASS] billing-webhook correctly rejected unsigned request (401)'
  } else {
    Write-Host "  [WARN] billing-webhook returned $httpWh (expected 401 for unsigned POST)"
  }
} finally {
  Remove-Item -Force $tmpWh -ErrorAction SilentlyContinue
}

if ($failed) {
  Write-Error 'Smoke test finished with at least one failing function.'
  exit 1
}

Write-Host 'Smoke test finished successfully.'
