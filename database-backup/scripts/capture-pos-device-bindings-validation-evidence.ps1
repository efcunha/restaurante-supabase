Param(
  [string]$EvidenceDir = "",
  [string]$RlsSmokeAdminUserId = "",
  [string]$RlsSmokeOtherCompanyUserId = "",
  [string]$RlsSmokeTerminalId = "caixa_01"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
  $EvidenceDir = Join-Path $RootDir "logs/evidencias"
}

New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null

$stampUtc = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
$stampFile = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")

$verifyLog = Join-Path $EvidenceDir "pos-device-bindings-verify-$stampFile.log"
$smokeLog = Join-Path $EvidenceDir "pos-device-bindings-smoke-$stampFile.log"
$summaryMd = Join-Path $EvidenceDir "pos-device-bindings-validation-summary-$stampFile.md"

$verifyExit = 0
$smokeExit = 0
$overallExit = 0
$smokeSkipped = $false

Write-Host "[1/2] Executando verificação estrutural..."
try {
  & bash (Join-Path $ScriptDir "verify-pos-device-bindings.sh") *> $verifyLog
  $verifyExit = 0
}
catch {
  $verifyExit = 1
  $overallExit = 1
}

if ([string]::IsNullOrWhiteSpace($RlsSmokeAdminUserId) -or [string]::IsNullOrWhiteSpace($RlsSmokeOtherCompanyUserId)) {
  $smokeSkipped = $true
  "Smoke RLS pulado: parametros RlsSmokeAdminUserId/RlsSmokeOtherCompanyUserId não definidos." | Out-File -FilePath $smokeLog -Encoding utf8
}
else {
  Write-Host "[2/2] Executando smoke RLS..."

  $env:RLS_SMOKE_ADMIN_USER_ID = $RlsSmokeAdminUserId
  $env:RLS_SMOKE_OTHER_COMPANY_USER_ID = $RlsSmokeOtherCompanyUserId
  $env:RLS_SMOKE_TERMINAL_ID = $RlsSmokeTerminalId

  try {
    & bash (Join-Path $ScriptDir "smoke-pos-device-bindings-rls.sh") *> $smokeLog
    $smokeExit = 0
  }
  catch {
    $smokeExit = 1
    $overallExit = 1
  }
}

$overallResult = if ($overallExit -eq 0) { "GO" } else { "NO-GO" }

$smokeInterpretation = "smoke_exit_code=0: isolamento entre tenants confirmado na prática."
if ($smokeSkipped) {
  $smokeInterpretation = "smoke_skipped=true: isolamento cross-tenant não foi validado nesta execução (faltaram parâmetros/usuários de teste)."
}

$summary = @"
# Evidência de validação - pos_device_bindings

- timestamp_utc: $stampUtc
- migration: 20260413233000_create_pos_device_bindings.sql
- verify_exit_code: $verifyExit
- smoke_exit_code: $smokeExit
- smoke_skipped: $smokeSkipped
- overall_result: $overallResult

## Artefatos

- verify_log: $(Split-Path $verifyLog -Leaf)
- smoke_log: $(Split-Path $smokeLog -Leaf)
- summary_md: $(Split-Path $summaryMd -Leaf)

## Interpretação rápida

1. verify_exit_code=0: estrutura, RLS, policies, índices e trigger válidos.
2. $smokeInterpretation
3. overall_result=GO: pronto para avançar no rollout controlado.
4. overall_result=NO-GO: corrigir falhas antes de promover.
"@

$summary | Out-File -FilePath $summaryMd -Encoding utf8

Write-Host ""
Write-Host "Evidências geradas em: $EvidenceDir"
Write-Host "- $verifyLog"
Write-Host "- $smokeLog"
Write-Host "- $summaryMd"

if ($overallExit -ne 0) {
  exit 1
}

exit 0
