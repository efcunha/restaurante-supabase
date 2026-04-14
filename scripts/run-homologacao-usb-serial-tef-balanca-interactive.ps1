$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

Write-Host "=== Homologacao USB/Serial (TEF + Balanca) - Modo Interativo ==="
Write-Host "Nenhum secret sera salvo em arquivo por este launcher."
Write-Host ""

$ScaleUrl = Read-Host "SCALE_URL [http://localhost:3031]"
if ([string]::IsNullOrWhiteSpace($ScaleUrl)) { $ScaleUrl = "http://localhost:3031" }

$ApiKey = Read-Host "API_KEY do bridge (opcional)"
$OpsUrl = Read-Host "OPS_URL (opcional, vazio = pula TEF)"
$CompanyId = Read-Host "COMPANY_ID (opcional, vazio = pula TEF)"

$AuthToken = ""
if (-not [string]::IsNullOrWhiteSpace($OpsUrl) -and -not [string]::IsNullOrWhiteSpace($CompanyId)) {
  $secureToken = Read-Host "AUTH_TOKEN (nao sera exibido)" -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $AuthToken = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

$ComandaNumber = Read-Host "COMANDA_NUMBER [10]"
if ([string]::IsNullOrWhiteSpace($ComandaNumber)) { $ComandaNumber = "10" }

$AmountCentsStr = Read-Host "AMOUNT_CENTS [1000]"
if ([string]::IsNullOrWhiteSpace($AmountCentsStr)) { $AmountCentsStr = "1000" }
$AmountCents = [int]$AmountCentsStr

$PaymentMethod = Read-Host "PAYMENT_METHOD [cartao_credito]"
if ([string]::IsNullOrWhiteSpace($PaymentMethod)) { $PaymentMethod = "cartao_credito" }

Write-Host ""
Write-Host "Executando coleta..."

powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ScriptDir "capture-usb-serial-tef-balanca.ps1") \
  -ScaleUrl $ScaleUrl \
  -ApiKey $ApiKey \
  -OpsUrl $OpsUrl \
  -AuthToken $AuthToken \
  -CompanyId $CompanyId \
  -ComandaNumber $ComandaNumber \
  -AmountCents $AmountCents \
  -PaymentMethod $PaymentMethod

Write-Host ""
Write-Host "Concluido. Consulte os artefatos em: $RootDir/tmp/evidencias"
