$ErrorActionPreference = 'Stop'

# Smoke test for restaurante-ops rate limiting (PowerShell).
# Validates 429 for threshold exceed and optional 503 behavior in strict-mode outage drills.

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:4040' }
$TestEmail = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { 'rate-limit-smoke@example.com' }
$TestPassword = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { 'wrong-password' }
$Attempts = if ($env:ATTEMPTS) { [int]$env:ATTEMPTS } else { 10 }
$LoginPath = if ($env:LOGIN_PATH) { $env:LOGIN_PATH } else { '/auth/login' }
$BillingPath = if ($env:BILLING_PATH) { $env:BILLING_PATH } else { '/ops/billing/reconcile' }
$AuthCookie = if ($env:AUTH_COOKIE) { $env:AUTH_COOKIE } else { '' }
$BillingJson = if ($env:BILLING_JSON) { $env:BILLING_JSON } else { '' }
$AuthEmail = if ($env:AUTH_EMAIL) { $env:AUTH_EMAIL } else { '' }
$AuthPassword = if ($env:AUTH_PASSWORD) { $env:AUTH_PASSWORD } else { '' }
$ReportFile = if ($env:REPORT_FILE) { $env:REPORT_FILE } else { '' }

if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
  $reportDir = Split-Path -Parent $ReportFile
  if (-not [string]::IsNullOrWhiteSpace($reportDir) -and -not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  }
  Start-Transcript -Path $ReportFile -Append | Out-Null
  Write-Host "[INFO] Report file: $ReportFile"
  Write-Host "[INFO] Started at: $((Get-Date).ToUniversalTime().ToString('o'))"
}

trap {
  if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
    try {
      Stop-Transcript | Out-Null
    } catch {
      # no-op
    }
  }
  throw $_
}

function Write-Section([string]$Text) {
  Write-Host ""
  Write-Host "== $Text =="
}

function Assert-Header([hashtable]$Headers, [string]$Name) {
  if (-not $Headers.ContainsKey($Name)) {
    throw "Missing expected header: $Name"
  }
}

function Convert-HeadersToHashtable($HeaderCollection) {
  $headers = @{}
  if ($null -eq $HeaderCollection) {
    return $headers
  }

  foreach ($key in $HeaderCollection.Keys) {
    $headers[$key] = $HeaderCollection[$key]
  }
  return $headers
}

function Invoke-RequestSafe {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][string]$Method,
    [string]$ContentType,
    [string]$Body,
    [hashtable]$Headers,
    [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession
  )

  try {
    $params = @{
      Uri = $Uri
      Method = $Method
      MaximumRedirection = 0
      ErrorAction = 'Stop'
    }
    if (-not [string]::IsNullOrWhiteSpace($ContentType)) {
      $params.ContentType = $ContentType
    }
    if (-not [string]::IsNullOrWhiteSpace($Body)) {
      $params.Body = $Body
    }
    if ($null -ne $Headers -and $Headers.Count -gt 0) {
      $params.Headers = $Headers
    }
    if ($null -ne $WebSession) {
      $params.WebSession = $WebSession
    }

    $response = Invoke-WebRequest @params
    return [pscustomobject]@{
      StatusCode = [int]$response.StatusCode
      Headers = (Convert-HeadersToHashtable $response.Headers)
      Content = ($response.Content | Out-String)
    }
  } catch [System.Net.WebException] {
    $httpResponse = $_.Exception.Response
    if ($null -eq $httpResponse) {
      throw
    }

    $content = ''
    try {
      $stream = $httpResponse.GetResponseStream()
      if ($null -ne $stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $content = $reader.ReadToEnd()
        $reader.Close()
      }
    } catch {
      $content = ''
    }

    return [pscustomobject]@{
      StatusCode = [int]$httpResponse.StatusCode
      Headers = (Convert-HeadersToHashtable $httpResponse.Headers)
      Content = $content
    }
  }
}

function Invoke-LoginOnce {
  $uri = "$BaseUrl$LoginPath"
  $body = "email=$TestEmail&password=$TestPassword"
  return Invoke-RequestSafe -Uri $uri -Method 'Post' -ContentType 'application/x-www-form-urlencoded' -Body $body
}

Write-Section "Login rate-limit smoke ($BaseUrl$LoginPath)"
Write-Host "Using ATTEMPTS=$Attempts email=$TestEmail"

$lastLoginResponse = $null
for ($i = 1; $i -le $Attempts; $i++) {
  $response = Invoke-LoginOnce
  Write-Host "Attempt $i -> HTTP $($response.StatusCode)"
  $lastLoginResponse = $response
}

if ($lastLoginResponse.StatusCode -ne 429) {
  throw "Expected last login attempt to return 429, got $($lastLoginResponse.StatusCode)"
}

Assert-Header $lastLoginResponse.Headers 'Retry-After'
Assert-Header $lastLoginResponse.Headers 'X-RateLimit-Remaining'
Assert-Header $lastLoginResponse.Headers 'X-RateLimit-Reset'
Write-Host '[PASS] Login endpoint returned 429 with expected headers'
Write-Host '[INFO] Login headers:'
$lastLoginResponse.Headers.GetEnumerator() | ForEach-Object {
  Write-Host ("{0}: {1}" -f $_.Key, $_.Value)
}

if ([string]::IsNullOrWhiteSpace($AuthCookie) -and -not [string]::IsNullOrWhiteSpace($AuthEmail) -and -not [string]::IsNullOrWhiteSpace($AuthPassword)) {
  Write-Section 'Generating auth cookie via /auth/login'
  $authSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $authBody = "email=$AuthEmail&password=$AuthPassword"
  $authResponse = Invoke-RequestSafe -Uri "$BaseUrl$LoginPath" -Method 'Post' -ContentType 'application/x-www-form-urlencoded' -Body $authBody -WebSession $authSession

  if ($authResponse.StatusCode -ne 302) {
    throw "Could not create authenticated session for billing smoke (HTTP $($authResponse.StatusCode))"
  }

  $cookie = $authSession.Cookies.GetCookies($BaseUrl) | Where-Object { $_.Name -eq 'ops_session' } | Select-Object -First 1
  if ($null -eq $cookie -or [string]::IsNullOrWhiteSpace($cookie.Value)) {
    throw 'Login succeeded but ops_session cookie was not captured'
  }

  $AuthCookie = "ops_session=$($cookie.Value)"
  Write-Host '[PASS] Auth cookie generated from AUTH_EMAIL/AUTH_PASSWORD'
}

if ([string]::IsNullOrWhiteSpace($BillingJson)) {
  Write-Section 'Billing validation skipped'
  Write-Host 'Set BILLING_JSON and either AUTH_COOKIE or AUTH_EMAIL/AUTH_PASSWORD to validate billing rate limiting.'
  Write-Host 'Example:'
  Write-Host "  `$env:AUTH_COOKIE='ops_session=<token>'; `$env:BILLING_JSON='{""companyId"":""<uuid>"",""idempotencyKey"":""smoke-1"",""eventType"":""payment_received"",""paymentStatus"":""paid""}'; ./scripts/rate-limit-smoke.ps1"
  Write-Host "  `$env:AUTH_EMAIL='ops@example.com'; `$env:AUTH_PASSWORD='***'; `$env:BILLING_JSON='{""companyId"":""<uuid>"",""idempotencyKey"":""smoke-1"",""eventType"":""payment_received"",""paymentStatus"":""paid""}'; ./scripts/rate-limit-smoke.ps1"
  if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
    Stop-Transcript | Out-Null
  }
  exit 0
}

if ([string]::IsNullOrWhiteSpace($AuthCookie)) {
  throw 'Missing authenticated session: set AUTH_COOKIE or provide AUTH_EMAIL/AUTH_PASSWORD'
}

Write-Section "Billing rate-limit smoke ($BaseUrl$BillingPath)"

$billingHeaders = @{ 
  'Content-Type' = 'application/json'
  'Cookie' = $AuthCookie
}
$lastBillingResponse = $null
for ($i = 1; $i -le $Attempts; $i++) {
  $response = Invoke-RequestSafe -Uri "$BaseUrl$BillingPath" -Method 'Post' -Headers $billingHeaders -Body $BillingJson
  Write-Host "Billing attempt $i -> HTTP $($response.StatusCode)"
  $lastBillingResponse = $response
}

if ($lastBillingResponse.StatusCode -eq 429) {
  Assert-Header $lastBillingResponse.Headers 'Retry-After'
  Assert-Header $lastBillingResponse.Headers 'X-RateLimit-Remaining'
  Assert-Header $lastBillingResponse.Headers 'X-RateLimit-Reset'
  Write-Host '[PASS] Billing endpoint returned 429 with expected headers'
  Write-Host '[INFO] Billing headers:'
  $lastBillingResponse.Headers.GetEnumerator() | ForEach-Object {
    Write-Host ("{0}: {1}" -f $_.Key, $_.Value)
  }
  if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
    Stop-Transcript | Out-Null
  }
  exit 0
}

if ($lastBillingResponse.StatusCode -eq 503) {
  if (($lastBillingResponse.Content | Out-String) -notmatch 'Servico temporariamente indisponivel') {
    throw '503 billing response did not include temporary unavailability message'
  }
  Write-Host '[PASS] Billing endpoint returned 503 (strict fail-closed behavior)'
  Write-Host '[INFO] Billing headers:'
  $lastBillingResponse.Headers.GetEnumerator() | ForEach-Object {
    Write-Host ("{0}: {1}" -f $_.Key, $_.Value)
  }
  Write-Host '[INFO] Billing body:'
  Write-Host ($lastBillingResponse.Content | Out-String)
  if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
    Stop-Transcript | Out-Null
  }
  exit 0
}

if (-not [string]::IsNullOrWhiteSpace($ReportFile)) {
  Stop-Transcript | Out-Null
}
throw "Expected billing last response to be 429 or 503, got $($lastBillingResponse.StatusCode)"
