#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Homologacao USB/Serial (TEF + Balanca) - Modo Interativo ==="
echo "Nenhum secret sera salvo em arquivo por este launcher."
echo

read -r -p "SCALE_URL [http://localhost:3031]: " SCALE_URL
SCALE_URL="${SCALE_URL:-http://localhost:3031}"

read -r -p "API_KEY do bridge (opcional): " API_KEY

read -r -p "OPS_URL (opcional, vazio = pula TEF): " OPS_URL
read -r -p "COMPANY_ID (opcional, vazio = pula TEF): " COMPANY_ID

AUTH_TOKEN=""
if [[ -n "$OPS_URL" && -n "$COMPANY_ID" ]]; then
  read -r -s -p "AUTH_TOKEN (nao sera exibido): " AUTH_TOKEN
  echo
fi

read -r -p "COMANDA_NUMBER [10]: " COMANDA_NUMBER
COMANDA_NUMBER="${COMANDA_NUMBER:-10}"

read -r -p "AMOUNT_CENTS [1000]: " AMOUNT_CENTS
AMOUNT_CENTS="${AMOUNT_CENTS:-1000}"

read -r -p "PAYMENT_METHOD [cartao_credito]: " PAYMENT_METHOD
PAYMENT_METHOD="${PAYMENT_METHOD:-cartao_credito}"

echo
echo "Executando coleta..."

SCALE_URL="$SCALE_URL" \
API_KEY="$API_KEY" \
OPS_URL="$OPS_URL" \
AUTH_TOKEN="$AUTH_TOKEN" \
COMPANY_ID="$COMPANY_ID" \
COMANDA_NUMBER="$COMANDA_NUMBER" \
AMOUNT_CENTS="$AMOUNT_CENTS" \
PAYMENT_METHOD="$PAYMENT_METHOD" \
bash "$SCRIPT_DIR/capture-usb-serial-tef-balanca.sh"

echo
echo "Concluido. Consulte os artefatos em: $ROOT_DIR/tmp/evidencias"
