$ErrorActionPreference = "Continue"

# Remove token inválido do ambiente
Remove-Item Env:RAILWAY_TOKEN -ErrorAction SilentlyContinue

Set-Location "D:\restaurante-supabase\restaurante-ops"

Write-Host "=== Verificando autenticacao Railway ===" -ForegroundColor Cyan
railway whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha na autenticacao. Rode 'railway login' e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Criando projeto restaurante-ops ===" -ForegroundColor Cyan
railway init --name "restaurante-ops"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao criar projeto. Tentando linkar projeto existente..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Status do projeto ===" -ForegroundColor Cyan
railway status

Write-Host ""
Write-Host "=== Configurando build: npm run build ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Iniciando deploy (railway up) ===" -ForegroundColor Cyan
railway up --detach
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha no deploy." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Gerando domínio publico ===" -ForegroundColor Cyan
railway domain
