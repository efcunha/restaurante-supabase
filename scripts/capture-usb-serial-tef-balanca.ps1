Param(
  [string]$ScaleUrl = "http://localhost:3031",
  [string]$ApiKey = "",
  [string]$OpsUrl = "",
  [string]$AuthToken = "",
  [string]$CompanyId = "",
  [string]$ComandaNumber = "10",
  [int]$AmountCents = 1000,
  [string]$PaymentMethod = "cartao_credito",
  [string]$OutDir = "",
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $RootDir "tmp/evidencias"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$StampUtc = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
$StampFile = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")

$StatusJson = Join-Path $OutDir "bridge-status-$StampFile.json"
$PesoJson = Join-Path $OutDir "bridge-peso-$StampFile.json"
$PesoEstavelJson = Join-Path $OutDir "bridge-peso-estavel-$StampFile.json"
$TaraJson = Join-Path $OutDir "bridge-tara-$StampFile.json"

$TefInit1Json = Join-Path $OutDir "tef-init-1-$StampFile.json"
$TefInit2Json = Join-Path $OutDir "tef-init-2-$StampFile.json"
$TefStatusJson = Join-Path $OutDir "tef-status-$StampFile.json"

$SummaryJson = Join-Path $OutDir "homologacao-usb-serial-tef-balanca-$StampFile.json"
$SummaryMd = Join-Path $OutDir "homologacao-usb-serial-tef-balanca-$StampFile.md"

function Invoke-Endpoint {
  param(
    [string]$Method,
    [string]$Uri,
    [string]$OutFile,
    $Body = $null,
    [hashtable]$Headers = @{}
  )

  try {
    if ($null -ne $Body) {
      $result = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body $Body
    } else {
      $result = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers
    }

    $result.Content | Out-File -FilePath $OutFile -Encoding utf8
    return [int]$result.StatusCode
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $_.ErrorDetails.Message | Out-File -FilePath $OutFile -Encoding utf8
    } else {
      "{`"error`":`"$($_.Exception.Message)`"}" | Out-File -FilePath $OutFile -Encoding utf8
    }

    return $statusCode
  }
}

$ScaleHeaders = @{}
if (-not [string]::IsNullOrWhiteSpace($ApiKey)) {
  $ScaleHeaders["x-api-key"] = $ApiKey
}

Write-Host "[1/4] Coletando bridge status..."
$StatusHttp = Invoke-Endpoint -Method "GET" -Uri "$ScaleUrl/status" -OutFile $StatusJson -Headers $ScaleHeaders

Write-Host "[2/4] Coletando bridge peso..."
$PesoHttp = Invoke-Endpoint -Method "GET" -Uri "$ScaleUrl/peso" -OutFile $PesoJson -Headers $ScaleHeaders

Write-Host "[3/4] Coletando bridge peso estavel..."
$PesoEstavelHttp = Invoke-Endpoint -Method "GET" -Uri "$ScaleUrl/peso/estavel" -OutFile $PesoEstavelJson -Headers $ScaleHeaders

Write-Host "[4/4] Enviando tara no bridge..."
$TaraHttp = Invoke-Endpoint -Method "POST" -Uri "$ScaleUrl/tara" -OutFile $TaraJson -Headers $ScaleHeaders

$BridgeStatusObj = $null
try { $BridgeStatusObj = Get-Content $StatusJson -Raw | ConvertFrom-Json } catch {}

$TefEnabled = $false
$TefInit1Http = $null
$TefInit2Http = $null
$TefStatusHttp = $null
$TefIdempotencyOk = $null
$TransactionId = ""

if (-not [string]::IsNullOrWhiteSpace($OpsUrl) -and -not [string]::IsNullOrWhiteSpace($AuthToken) -and -not [string]::IsNullOrWhiteSpace($CompanyId)) {
  $TefEnabled = $true
  $idempKey = "tef-$StampFile"

  $tefHeaders = @{ "Authorization" = "Bearer $AuthToken" }
  $tefBodyObj = @{
    companyId = $CompanyId
    comandaNumber = $ComandaNumber
    amount = $AmountCents
    paymentMethod = $PaymentMethod
    idempotencyKey = $idempKey
  }
  $tefBody = $tefBodyObj | ConvertTo-Json -Compress

  Write-Host "[TEF] Iniciando pagamento (1a chamada)..."
  $TefInit1Http = Invoke-Endpoint -Method "POST" -Uri "$OpsUrl/payments/initiate" -OutFile $TefInit1Json -Body $tefBody -Headers $tefHeaders

  Write-Host "[TEF] Iniciando pagamento (2a chamada mesma idempotencyKey)..."
  $TefInit2Http = Invoke-Endpoint -Method "POST" -Uri "$OpsUrl/payments/initiate" -OutFile $TefInit2Json -Body $tefBody -Headers $tefHeaders

  $tefInit1Obj = $null
  $tefInit2Obj = $null
  try { $tefInit1Obj = Get-Content $TefInit1Json -Raw | ConvertFrom-Json } catch {}
  try { $tefInit2Obj = Get-Content $TefInit2Json -Raw | ConvertFrom-Json } catch {}

  $tx1 = if ($tefInit1Obj -and $tefInit1Obj.transactionId) { [string]$tefInit1Obj.transactionId } else { "" }
  $tx2 = if ($tefInit2Obj -and $tefInit2Obj.transactionId) { [string]$tefInit2Obj.transactionId } else { "" }

  if (-not [string]::IsNullOrWhiteSpace($tx1) -and $tx1 -eq $tx2) {
    $TefIdempotencyOk = $true
  } elseif (-not [string]::IsNullOrWhiteSpace($tx1) -or -not [string]::IsNullOrWhiteSpace($tx2)) {
    $TefIdempotencyOk = $false
  }

  $TransactionId = $tx1

  if (-not [string]::IsNullOrWhiteSpace($TransactionId)) {
    Write-Host "[TEF] Consultando status da transacao..."
    $TefStatusHttp = Invoke-Endpoint -Method "GET" -Uri "$OpsUrl/payments/$TransactionId/status" -OutFile $TefStatusJson -Headers $tefHeaders
  }
}
else {
  Write-Host "[TEF] Variaveis OpsUrl/AuthToken/CompanyId ausentes. Coleta TEF sera ignorada."
}

$SummaryObj = [ordered]@{
  timestamp_utc = $StampUtc
  environment = $Environment
  scale = [ordered]@{
    base_url = $ScaleUrl
    status_http = $StatusHttp
    peso_http = $PesoHttp
    peso_estavel_http = $PesoEstavelHttp
    tara_http = $TaraHttp
    serial_aberta = if ($BridgeStatusObj) { $BridgeStatusObj.serial_aberta } else { $null }
    baud = if ($BridgeStatusObj) { $BridgeStatusObj.baud } else { $null }
    protocolo = if ($BridgeStatusObj) { $BridgeStatusObj.protocolo } else { $null }
    artifacts = [ordered]@{
      status = $StatusJson
      peso = $PesoJson
      peso_estavel = $PesoEstavelJson
      tara = $TaraJson
    }
  }
  tef = [ordered]@{
    enabled = $TefEnabled
    company_id = if ([string]::IsNullOrWhiteSpace($CompanyId)) { $null } else { $CompanyId }
    ops_url = if ([string]::IsNullOrWhiteSpace($OpsUrl)) { $null } else { $OpsUrl }
    init_1_http = $TefInit1Http
    init_2_http = $TefInit2Http
    idempotency_ok = $TefIdempotencyOk
    transaction_id = if ([string]::IsNullOrWhiteSpace($TransactionId)) { $null } else { $TransactionId }
    status_http = $TefStatusHttp
    artifacts = [ordered]@{
      init_1 = if ($TefEnabled) { $TefInit1Json } else { $null }
      init_2 = if ($TefEnabled) { $TefInit2Json } else { $null }
      status = if ($TefEnabled) { $TefStatusJson } else { $null }
    }
  }
}

$SummaryObj | ConvertTo-Json -Depth 8 | Out-File -FilePath $SummaryJson -Encoding utf8

$SummaryMdContent = @"
# Evidencia USB/Serial - TEF + Balanca

- timestamp_utc: $StampUtc
- scale_url: $ScaleUrl
- bridge_status_http: $StatusHttp
- bridge_peso_http: $PesoHttp
- bridge_peso_estavel_http: $PesoEstavelHttp
- bridge_tara_http: $TaraHttp
- bridge_serial_aberta: $($SummaryObj.scale.serial_aberta)
- bridge_baud: $($SummaryObj.scale.baud)
- bridge_protocolo: $($SummaryObj.scale.protocolo)

## TEF

- tef_enabled: $TefEnabled
- ops_url: $(if ([string]::IsNullOrWhiteSpace($OpsUrl)) { "n/a" } else { $OpsUrl })
- tef_init_1_http: $(if ($null -eq $TefInit1Http) { "n/a" } else { $TefInit1Http })
- tef_init_2_http: $(if ($null -eq $TefInit2Http) { "n/a" } else { $TefInit2Http })
- tef_idempotency_ok: $(if ($null -eq $TefIdempotencyOk) { "n/a" } else { $TefIdempotencyOk })
- tef_transaction_id: $(if ([string]::IsNullOrWhiteSpace($TransactionId)) { "n/a" } else { $TransactionId })
- tef_status_http: $(if ($null -eq $TefStatusHttp) { "n/a" } else { $TefStatusHttp })

## Artefatos

- $(Split-Path $StatusJson -Leaf)
- $(Split-Path $PesoJson -Leaf)
- $(Split-Path $PesoEstavelJson -Leaf)
- $(Split-Path $TaraJson -Leaf)
- $(Split-Path $TefInit1Json -Leaf)
- $(Split-Path $TefInit2Json -Leaf)
- $(Split-Path $TefStatusJson -Leaf)
- $(Split-Path $SummaryJson -Leaf)
- $(Split-Path $SummaryMd -Leaf)
"@

$SummaryMdContent | Out-File -FilePath $SummaryMd -Encoding utf8

Write-Host "Coleta concluida com sucesso."
Write-Host "Resumo markdown: $SummaryMd"
Write-Host "Resumo json: $SummaryJson"
