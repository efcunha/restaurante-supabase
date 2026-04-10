#!/bin/bash

# Script para executar testes TEF-14/15 INT_REAL com credenciais necessárias
# 
# Uso:
#   bash ./restaurante-web/scripts/run-tef14-15-tests.sh \
#     --token "seu-bearer-token" \
#     --company "company-uuid" \
#     --comanda "999" \
#     --all  # ou --tef14 ou --tef15

set -e

# Default values
TOKEN=""
COMPANY_ID=""
COMANDA="999"
TEST_MODE="all"
BASE_URL="https://restaurante-web.app.br"
OPS_URL="https://ops.restaurante-web.app.br"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --company)
      COMPANY_ID="$2"
      shift 2
      ;;
    --comanda)
      COMANDA="$2"
      shift 2
      ;;
    --all)
      TEST_MODE="all"
      shift
      ;;
    --tef14)
      TEST_MODE="tef14"
      shift
      ;;
    --tef15)
      TEST_MODE="tef15"
      shift
      ;;
    --help)
      echo "Usage: $0 --token TOKEN --company COMPANY_ID [--comanda COMANDA] [--all|--tef14|--tef15]"
      echo ""
      echo "Exemplos:"
      echo "  $0 --token 'eyJ...' --company '12345678-1234-1234-1234-123456789abc' --all"
      echo "  $0 --token 'eyJ...' --company '12345678-1234-1234-1234-123456789abc' --tef14"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validar argumentos obrigatórios
if [ -z "$TOKEN" ]; then
  echo "❌ Erro: --token é obrigatório"
  echo "Use: $0 --help"
  exit 1
fi

if [ -z "$COMPANY_ID" ]; then
  echo "❌ Erro: --company é obrigatório"
  echo "Use: $0 --help"
  exit 1
fi

# Executar testes
cd "$(dirname "$0")/.."

echo "🔍 Configuração:"
echo "  Base URL: $BASE_URL"
echo "  Ops URL: $OPS_URL"
echo "  Company ID: $COMPANY_ID"
echo "  Comanda: $COMANDA"
echo "  Token: ${TOKEN:0:20}..."
echo ""

case $TEST_MODE in
  all)
    echo "📋 Executando todos os testes (TEF-14 + TEF-15)..."
    export E2E_TEST_TOKEN="$TOKEN"
    export E2E_TEST_COMPANY_ID="$COMPANY_ID"
    export E2E_TEST_COMANDA="$COMANDA"
    export PLAYWRIGHT_BASE_URL="$BASE_URL"
    export PLAYWRIGHT_OPS_BASE_URL="$OPS_URL"
    export PDV_E2E_INT_REAL="true"
    npx playwright test e2e/pdv-maquininha-validacao.spec.ts --workers=1 --reporter=line
    ;;
  tef14)
    echo "📋 Executando apenas TEF-14 (Idempotência)..."
    export E2E_TEST_TOKEN="$TOKEN"
    export E2E_TEST_COMPANY_ID="$COMPANY_ID"
    export E2E_TEST_COMANDA="$COMANDA"
    export PLAYWRIGHT_BASE_URL="$BASE_URL"
    export PLAYWRIGHT_OPS_BASE_URL="$OPS_URL"
    export PDV_E2E_INT_REAL="true"
    npx playwright test e2e/pdv-maquininha-validacao.spec.ts --grep 'TEF-14' --workers=1 --reporter=line
    ;;
  tef15)
    echo "📋 Executando apenas TEF-15 (Validação)..."
    export E2E_TEST_TOKEN="$TOKEN"
    export E2E_TEST_COMPANY_ID="$COMPANY_ID"
    export E2E_TEST_COMANDA="$COMANDA"
    export PLAYWRIGHT_BASE_URL="$BASE_URL"
    export PLAYWRIGHT_OPS_BASE_URL="$OPS_URL"
    export PDV_E2E_INT_REAL="true"
    npx playwright test e2e/pdv-maquininha-validacao.spec.ts --grep 'TEF-15' --workers=1 --reporter=line
    ;;
esac

echo ""
echo "✅ Testes concluídos!"
