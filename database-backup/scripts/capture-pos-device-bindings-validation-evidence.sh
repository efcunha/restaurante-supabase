#!/bin/bash

# Executa verificacao estrutural + smoke RLS e gera evidencias versionadas por timestamp.
# Uso:
#   cd database-backup
#   export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company_A>"
#   export RLS_SMOKE_OTHER_COMPANY_USER_ID="<uuid_profile_company_B>"
#   export RLS_SMOKE_TERMINAL_ID="caixa_01"
#   bash scripts/capture-pos-device-bindings-validation-evidence.sh
#
# Opcional:
#   EVIDENCE_DIR=/caminho/customizado

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

EVIDENCE_DIR="${EVIDENCE_DIR:-$ROOT_DIR/logs/evidencias}"
mkdir -p "$EVIDENCE_DIR"

STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_FILE="$(date -u +"%Y%m%dT%H%M%SZ")"

VERIFY_LOG="$EVIDENCE_DIR/pos-device-bindings-verify-$STAMP_FILE.log"
SMOKE_LOG="$EVIDENCE_DIR/pos-device-bindings-smoke-$STAMP_FILE.log"
SUMMARY_MD="$EVIDENCE_DIR/pos-device-bindings-validation-summary-$STAMP_FILE.md"

VERIFY_EXIT=0
SMOKE_EXIT=0
OVERALL_EXIT=0

echo "[1/2] Executando verificação estrutural..."
set +e
bash "$SCRIPT_DIR/verify-pos-device-bindings.sh" >"$VERIFY_LOG" 2>&1
VERIFY_EXIT=$?
set -e

if [[ $VERIFY_EXIT -ne 0 ]]; then
  OVERALL_EXIT=1
fi

SMOKE_SKIPPED="false"
if [[ -z "${RLS_SMOKE_ADMIN_USER_ID:-}" || -z "${RLS_SMOKE_OTHER_COMPANY_USER_ID:-}" ]]; then
  SMOKE_SKIPPED="true"
  echo "[2/2] Smoke RLS pulado: variáveis RLS_SMOKE_* não definidas." | tee "$SMOKE_LOG" >/dev/null
else
  echo "[2/2] Executando smoke RLS..."
  set +e
  bash "$SCRIPT_DIR/smoke-pos-device-bindings-rls.sh" >"$SMOKE_LOG" 2>&1
  SMOKE_EXIT=$?
  set -e

  if [[ $SMOKE_EXIT -ne 0 ]]; then
    OVERALL_EXIT=1
  fi
fi

SMOKE_INTERPRETATION="smoke_exit_code=0: isolamento entre tenants confirmado na prática."
if [[ "$SMOKE_SKIPPED" == "true" ]]; then
  SMOKE_INTERPRETATION="smoke_skipped=true: isolamento cross-tenant não foi validado nesta execução (faltaram variáveis/usuários de teste)."
fi

cat > "$SUMMARY_MD" <<EOF
# Evidência de validação - pos_device_bindings

- timestamp_utc: $STAMP_UTC
- migration: 20260413233000_create_pos_device_bindings.sql
- verify_exit_code: $VERIFY_EXIT
- smoke_exit_code: $SMOKE_EXIT
- smoke_skipped: $SMOKE_SKIPPED
- overall_result: $( [[ $OVERALL_EXIT -eq 0 ]] && echo "GO" || echo "NO-GO" )

## Artefatos

- verify_log: $(basename "$VERIFY_LOG")
- smoke_log: $(basename "$SMOKE_LOG")
- summary_md: $(basename "$SUMMARY_MD")

## Interpretação rápida

1. verify_exit_code=0: estrutura, RLS, policies, índices e trigger válidos.
2. $SMOKE_INTERPRETATION
3. overall_result=GO: pronto para avançar no rollout controlado.
4. overall_result=NO-GO: corrigir falhas antes de promover.

EOF

echo ""
echo "Evidências geradas em: $EVIDENCE_DIR"
echo "- $VERIFY_LOG"
echo "- $SMOKE_LOG"
echo "- $SUMMARY_MD"

exit $OVERALL_EXIT
