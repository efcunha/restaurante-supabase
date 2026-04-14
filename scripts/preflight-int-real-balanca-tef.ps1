param(
  [string]$OutDir = "",
  [string]$Environment = "production",
  [string]$ScaleUrl = "http://localhost:3031",
  [string]$OpsUrl = "https://ops.restaurante-web.app.br",
  [string]$CompanyId = "",
  [string]$AuthToken = "",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $RootDir "tmp/evidencias"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$stampUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$stampFile = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")

$statusJson = Join-Path $OutDir "preflight-bridge-status-$stampFile.json"
$healthzJson = Join-Path $OutDir "preflight-ops-healthz-$stampFile.json"
$apiStatusJson = Join-Path $OutDir "preflight-ops-api-status-$stampFile.json"
$summaryJson = Join-Path $OutDir "preflight-int-real-balanca-tef-$stampFile.json"
$summaryMd = Join-Path $OutDir "preflight-int-real-balanca-tef-$stampFile.md"

function Invoke-HttpGet {
  param(
    [string]$Url,
    [string]$OutFile,
    [hashtable]$Headers
  )

  try {
    $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -OutFile $OutFile -UseBasicParsing
    return [string]$response.StatusCode
  }
  catch {
    return "000"
  }
}

$bridgeHeaders = @{}
if (-not [string]::IsNullOrWhiteSpace($ApiKey)) {
  $bridgeHeaders["x-api-key"] = $ApiKey
}

$opsHeaders = @{}
if (-not [string]::IsNullOrWhiteSpace($AuthToken)) {
  $opsHeaders["Authorization"] = "Bearer $AuthToken"
}

Write-Host "[1/3] Validando bridge /status..."
$bridgeStatusHttp = Invoke-HttpGet -Url "$ScaleUrl/status" -OutFile $statusJson -Headers $bridgeHeaders

Write-Host "[2/3] Validando ops /healthz..."
$opsHealthzHttp = Invoke-HttpGet -Url "$OpsUrl/healthz" -OutFile $healthzJson -Headers @{}

Write-Host "[3/3] Validando ops /api/status..."
$opsApiStatusHttp = Invoke-HttpGet -Url "$OpsUrl/api/status" -OutFile $apiStatusJson -Headers $opsHeaders

$serialAberta = ""
if (Test-Path $statusJson) {
  try {
    $statusObj = Get-Content -Raw $statusJson | ConvertFrom-Json
    $serialAberta = [string]$statusObj.serial_aberta
  }
  catch {
    $serialAberta = ""
  }
}

$bridgeOk = ($bridgeStatusHttp -eq "200")
$opsHealthOk = ($opsHealthzHttp -eq "200")
$opsApiOk = ($opsApiStatusHttp -eq "200")
$overallOk = ($bridgeOk -and $opsHealthOk -and $opsApiOk)

$summaryObj = [ordered]@{
  timestamp_utc = $stampUtc
  environment = $Environment
  company_id = $CompanyId
  bridge = [ordered]@{
    base_url = $ScaleUrl
    status_http = $bridgeStatusHttp
    serial_aberta = $serialAberta
    ok = $bridgeOk
    artifact = [IO.Path]::GetFileName($statusJson)
  }
  ops = [ordered]@{
    base_url = $OpsUrl
    healthz_http = $opsHealthzHttp
    api_status_http = $opsApiStatusHttp
    health_ok = $opsHealthOk
    api_ok = $opsApiOk
    artifacts = [ordered]@{
      healthz = [IO.Path]::GetFileName($healthzJson)
      api_status = [IO.Path]::GetFileName($apiStatusJson)
    }
  }
  overall_preflight_ok = $overallOk
}

$summaryObj | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $summaryJson

$md = @"
# Preflight INT_REAL - Balanca + TEF

- timestamp_utc: $stampUtc
- environment: $Environment
- company_id: $(if ([string]::IsNullOrWhiteSpace($CompanyId)) { 'n/a' } else { $CompanyId })

## Bridge

- scale_url: $ScaleUrl
- status_http: $bridgeStatusHttp
- serial_aberta: $(if ([string]::IsNullOrWhiteSpace($serialAberta)) { 'n/a' } else { $serialAberta })
- bridge_ok: $bridgeOk

## OPS

- ops_url: $OpsUrl
- healthz_http: $opsHealthzHttp
- api_status_http: $opsApiStatusHttp
- ops_health_ok: $opsHealthOk
- ops_api_ok: $opsApiOk

## Resultado

- overall_preflight_ok: $overallOk

## Artefatos

- $([IO.Path]::GetFileName($statusJson))
- $([IO.Path]::GetFileName($healthzJson))
- $([IO.Path]::GetFileName($apiStatusJson))
- $([IO.Path]::GetFileName($summaryJson))
- $([IO.Path]::GetFileName($summaryMd))
"@

Set-Content -Encoding UTF8 -Path $summaryMd -Value $md

Write-Host "Preflight concluido."
Write-Host "Resumo markdown: $summaryMd"
Write-Host "Resumo json: $summaryJson"