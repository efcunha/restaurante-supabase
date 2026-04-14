#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUT_DIR="${OUT_DIR:-$ROOT_DIR/tmp/evidencias}"
mkdir -p "$OUT_DIR"

STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_FILE="$(date -u +"%Y%m%dT%H%M%SZ")"

SCALE_URL="${SCALE_URL:-http://localhost:3031}"
API_KEY="${API_KEY:-}"

OPS_URL="${OPS_URL:-}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
COMPANY_ID="${COMPANY_ID:-}"
COMANDA_NUMBER="${COMANDA_NUMBER:-10}"
AMOUNT_CENTS="${AMOUNT_CENTS:-1000}"
PAYMENT_METHOD="${PAYMENT_METHOD:-cartao_credito}"

STATUS_JSON="$OUT_DIR/bridge-status-$STAMP_FILE.json"
PESO_JSON="$OUT_DIR/bridge-peso-$STAMP_FILE.json"
PESO_ESTAVEL_JSON="$OUT_DIR/bridge-peso-estavel-$STAMP_FILE.json"
TARA_JSON="$OUT_DIR/bridge-tara-$STAMP_FILE.json"
SUMMARY_MD="$OUT_DIR/homologacao-usb-serial-tef-balanca-$STAMP_FILE.md"
SUMMARY_JSON="$OUT_DIR/homologacao-usb-serial-tef-balanca-$STAMP_FILE.json"

TEF_INIT_1_JSON="$OUT_DIR/tef-init-1-$STAMP_FILE.json"
TEF_INIT_2_JSON="$OUT_DIR/tef-init-2-$STAMP_FILE.json"
TEF_STATUS_JSON="$OUT_DIR/tef-status-$STAMP_FILE.json"

API_HEADERS=()
if [[ -n "$API_KEY" ]]; then
  API_HEADERS=(-H "x-api-key: $API_KEY")
fi

curl_http_json() {
  local method="$1"
  local url="$2"
  local output_file="$3"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "${API_HEADERS[@]}" -H "Content-Type: application/json" -d "$body" "$url"
  else
    curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "${API_HEADERS[@]}" "$url"
  fi
}

echo "[1/4] Coletando bridge status..."
STATUS_HTTP="$(curl_http_json "GET" "$SCALE_URL/status" "$STATUS_JSON")"

echo "[2/4] Coletando bridge peso..."
PESO_HTTP="$(curl_http_json "GET" "$SCALE_URL/peso" "$PESO_JSON")"

echo "[3/4] Coletando bridge peso estavel..."
PESO_ESTAVEL_HTTP="$(curl_http_json "GET" "$SCALE_URL/peso/estavel" "$PESO_ESTAVEL_JSON")"

echo "[4/4] Enviando tara no bridge..."
TARA_HTTP="$(curl_http_json "POST" "$SCALE_URL/tara" "$TARA_JSON")"

TEF_ENABLED="false"
TEF_INIT_1_HTTP=""
TEF_INIT_2_HTTP=""
TEF_STATUS_HTTP=""
TEF_IDEMPOTENCY_OK=""
TEF_TRANSACTION_ID=""

if [[ -n "$OPS_URL" && -n "$AUTH_TOKEN" && -n "$COMPANY_ID" ]]; then
  TEF_ENABLED="true"
  IDEMP_KEY="tef-$STAMP_FILE"

  TEF_BODY="{\"companyId\":\"$COMPANY_ID\",\"comandaNumber\":\"$COMANDA_NUMBER\",\"amount\":$AMOUNT_CENTS,\"paymentMethod\":\"$PAYMENT_METHOD\",\"idempotencyKey\":\"$IDEMP_KEY\"}"

  echo "[TEF] Iniciando pagamento (1a chamada)..."
  TEF_INIT_1_HTTP="$(curl -sS -o "$TEF_INIT_1_JSON" -w "%{http_code}" -X POST "$OPS_URL/payments/initiate" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$TEF_BODY")"

  echo "[TEF] Iniciando pagamento (2a chamada mesma idempotencyKey)..."
  TEF_INIT_2_HTTP="$(curl -sS -o "$TEF_INIT_2_JSON" -w "%{http_code}" -X POST "$OPS_URL/payments/initiate" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$TEF_BODY")"

  if command -v node >/dev/null 2>&1; then
    TX1="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.transactionId||''));}catch{process.stdout.write('');}" "$TEF_INIT_1_JSON")"
    TX2="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.transactionId||''));}catch{process.stdout.write('');}" "$TEF_INIT_2_JSON")"

    if [[ -n "$TX1" && "$TX1" == "$TX2" ]]; then
      TEF_IDEMPOTENCY_OK="true"
    else
      TEF_IDEMPOTENCY_OK="false"
    fi

    TEF_TRANSACTION_ID="$TX1"
  fi

  if [[ -n "$TEF_TRANSACTION_ID" ]]; then
    echo "[TEF] Consultando status da transacao..."
    TEF_STATUS_HTTP="$(curl -sS -o "$TEF_STATUS_JSON" -w "%{http_code}" -X GET "$OPS_URL/payments/$TEF_TRANSACTION_ID/status" -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json")"
  fi
else
  echo "[TEF] Variaveis OPS_URL/AUTH_TOKEN/COMPANY_ID ausentes. Coleta TEF sera ignorada."
fi

SERIAL_ABERTA=""
BAUD_VALUE=""
PROTOCOLO_VALUE=""

if command -v node >/dev/null 2>&1; then
  SERIAL_ABERTA="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.serial_aberta));}catch{process.stdout.write('');}" "$STATUS_JSON")"
  BAUD_VALUE="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.baud ?? ''));}catch{process.stdout.write('');}" "$STATUS_JSON")"
  PROTOCOLO_VALUE="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.protocolo ?? ''));}catch{process.stdout.write('');}" "$STATUS_JSON")"

  node -e "const fs=require('fs');
const out=process.argv[1];
const payload={
  timestamp_utc: process.argv[2],
  scale: {
    base_url: process.argv[3],
    status_http: process.argv[4],
    peso_http: process.argv[5],
    peso_estavel_http: process.argv[6],
    tara_http: process.argv[7],
    serial_aberta: process.argv[8],
    baud: process.argv[9],
    protocolo: process.argv[10],
    artifacts: {
      status: process.argv[11],
      peso: process.argv[12],
      peso_estavel: process.argv[13],
      tara: process.argv[14]
    }
  },
  tef: {
    enabled: process.argv[15] === 'true',
    ops_url: process.argv[16] || null,
    init_1_http: process.argv[17] || null,
    init_2_http: process.argv[18] || null,
    idempotency_ok: process.argv[19] === '' ? null : process.argv[19] === 'true',
    transaction_id: process.argv[20] || null,
    status_http: process.argv[21] || null,
    artifacts: {
      init_1: process.argv[22] || null,
      init_2: process.argv[23] || null,
      status: process.argv[24] || null
    }
  }
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2));" \
  "$SUMMARY_JSON" "$STAMP_UTC" "$SCALE_URL" "$STATUS_HTTP" "$PESO_HTTP" "$PESO_ESTAVEL_HTTP" "$TARA_HTTP" "$SERIAL_ABERTA" "$BAUD_VALUE" "$PROTOCOLO_VALUE" "$STATUS_JSON" "$PESO_JSON" "$PESO_ESTAVEL_JSON" "$TARA_JSON" "$TEF_ENABLED" "$OPS_URL" "$TEF_INIT_1_HTTP" "$TEF_INIT_2_HTTP" "$TEF_IDEMPOTENCY_OK" "$TEF_TRANSACTION_ID" "$TEF_STATUS_HTTP" "$TEF_INIT_1_JSON" "$TEF_INIT_2_JSON" "$TEF_STATUS_JSON"
fi

cat > "$SUMMARY_MD" <<EOF
# Evidencia USB/Serial - TEF + Balanca

- timestamp_utc: $STAMP_UTC
- scale_url: $SCALE_URL
- bridge_status_http: $STATUS_HTTP
- bridge_peso_http: $PESO_HTTP
- bridge_peso_estavel_http: $PESO_ESTAVEL_HTTP
- bridge_tara_http: $TARA_HTTP
- bridge_serial_aberta: ${SERIAL_ABERTA:-n/a}
- bridge_baud: ${BAUD_VALUE:-n/a}
- bridge_protocolo: ${PROTOCOLO_VALUE:-n/a}

## TEF

- tef_enabled: $TEF_ENABLED
- ops_url: ${OPS_URL:-n/a}
- tef_init_1_http: ${TEF_INIT_1_HTTP:-n/a}
- tef_init_2_http: ${TEF_INIT_2_HTTP:-n/a}
- tef_idempotency_ok: ${TEF_IDEMPOTENCY_OK:-n/a}
- tef_transaction_id: ${TEF_TRANSACTION_ID:-n/a}
- tef_status_http: ${TEF_STATUS_HTTP:-n/a}

## Artefatos

- $(basename "$STATUS_JSON")
- $(basename "$PESO_JSON")
- $(basename "$PESO_ESTAVEL_JSON")
- $(basename "$TARA_JSON")
- $(basename "$TEF_INIT_1_JSON")
- $(basename "$TEF_INIT_2_JSON")
- $(basename "$TEF_STATUS_JSON")
- $(basename "$SUMMARY_JSON")
- $(basename "$SUMMARY_MD")
EOF

echo "Coleta concluida com sucesso."
echo "Resumo markdown: $SUMMARY_MD"
echo "Resumo json: $SUMMARY_JSON"
