param(
  [string]$Th0thDir = "D:\th0th",
  [int]$Port = 3333,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Test-Th0thApiUp {
  param([int]$Port)
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2
    return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)
  } catch {
    return $false
  }
}

if (-not (Test-Path -LiteralPath $Th0thDir)) {
  Write-Error "Diretório do th0th não encontrado: $Th0thDir"
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Error "bun não encontrado no PATH. Instale o Bun ou ajuste o PATH."
}

if (-not $Force) {
  if (Test-Th0thApiUp -Port $Port) {
    Write-Host "th0th Tools API já está rodando em http://localhost:$Port"
    exit 0
  }
}

Write-Host "Iniciando th0th Tools API em $Th0thDir (porta $Port)..."

Start-Process -FilePath "bun" `
  -ArgumentList @("run", "start:api") `
  -WorkingDirectory $Th0thDir `
  -WindowStyle Minimized | Out-Null

Start-Sleep -Seconds 2

if (Test-Th0thApiUp -Port $Port) {
  Write-Host "OK: th0th Tools API disponível em http://localhost:$Port"
  exit 0
}

Write-Warning "A Tools API não respondeu ainda. Verifique o terminal/log em $Th0thDir e se o Ollama está ativo."
exit 1

