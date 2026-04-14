#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUT_DIR="${OUT_DIR:-$ROOT_DIR/tmp/evidencias}"
mkdir -p "$OUT_DIR"

STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_FILE="$(date -u +"%Y%m%dT%H%M%SZ")"

ENVIRONMENT="${ENVIRONMENT:-production}"
SCALE_URL="${SCALE_URL:-http://localhost:3031}"
OPS_URL="${OPS_URL:-https://ops.restaurante-web.app.br}"
COMPANY_ID="${COMPANY_ID:-}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
API_KEY="${API_KEY:-}"

STATUS_JSON="$OUT_DIR/preflight-bridge-status-$STAMP_FILE.json"
HEALTHZ_JSON="$OUT_DIR/preflight-ops-healthz-$STAMP_FILE.json"
API_STATUS_JSON="$OUT_DIR/preflight-ops-api-status-$STAMP_FILE.json"
SUMMARY_JSON="$OUT_DIR/preflight-int-real-balanca-tef-$STAMP_FILE.json"
SUMMARY_MD="$OUT_DIR/preflight-int-real-balanca-tef-$STAMP_FILE.md"

API_HEADERS=()
if [[ -n "$API_KEY" ]]; then
  API_HEADERS=(-H "x-api-key: $API_KEY")
fi

AUTH_HEADERS=()
if [[ -n "$AUTH_TOKEN" ]]; then
  AUTH_HEADERS=(-H "Authorization: Bearer $AUTH_TOKEN")
fi

http_get() {
  local url="$1"
  local output_file="$2"
  shift 2

  set +e
  local code
  code="$(curl -sS -o "$output_file" -w "%{http_code}" "$@" "$url")"
  local curl_exit=$?
  set -e

  if [[ $curl_exit -ne 0 ]]; then
    echo "000"
    return 0
  fi

  echo "$code"
}

echo "[1/3] Validando bridge /status..."
BRIDGE_STATUS_HTTP="$(http_get "$SCALE_URL/status" "$STATUS_JSON" "${API_HEADERS[@]}")"

echo "[2/3] Validando ops /healthz..."
OPS_HEALTHZ_HTTP="$(http_get "$OPS_URL/healthz" "$HEALTHZ_JSON")"

echo "[3/3] Validando ops /api/status..."
OPS_API_STATUS_HTTP="$(http_get "$OPS_URL/api/status" "$API_STATUS_JSON" "${AUTH_HEADERS[@]}")"

SERIAL_ABERTA=""
if command -v node >/dev/null 2>&1; then
  SERIAL_ABERTA="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.serial_aberta));}catch{process.stdout.write('');}" "$STATUS_JSON")"
fi

BRIDGE_OK="false"
OPS_HEALTH_OK="false"
OPS_API_OK="false"

if [[ "$BRIDGE_STATUS_HTTP" == "200" ]]; then
  BRIDGE_OK="true"
fi
if [[ "$OPS_HEALTHZ_HTTP" == "200" ]]; then
  OPS_HEALTH_OK="true"
fi
if [[ "$OPS_API_STATUS_HTTP" == "200" ]]; then
  OPS_API_OK="true"
fi

cat > "$SUMMARY_JSON" <<EOF
{
  "timestamp_utc": "$STAMP_UTC",
  "environment": "$ENVIRONMENT",
  "company_id": "${COMPANY_ID}",
  "bridge": {
    "base_url": "$SCALE_URL",
    "status_http": "$BRIDGE_STATUS_HTTP",
    "serial_aberta": "${SERIAL_ABERTA}",
    "ok": $BRIDGE_OK,
    "artifact": "$(basename "$STATUS_JSON")"
  },
  "ops": {
    "base_url": "$OPS_URL",
    "healthz_http": "$OPS_HEALTHZ_HTTP",
    "api_status_http": "$OPS_API_STATUS_HTTP",
    "health_ok": $OPS_HEALTH_OK,
    "api_ok": $OPS_API_OK,
    "artifacts": {
      "healthz": "$(basename "$HEALTHZ_JSON")",
      "api_status": "$(basename "$API_STATUS_JSON")"
    }
  },
  "overall_preflight_ok": $([[ "$BRIDGE_OK" == "true" && "$OPS_HEALTH_OK" == "true" && "$OPS_API_OK" == "true" ]] && echo true || echo false)
}
EOF

cat > "$SUMMARY_MD" <<EOF
# Preflight INT_REAL - Balanca + TEF

- timestamp_utc: $STAMP_UTC
- environment: $ENVIRONMENT
- company_id: ${COMPANY_ID:-n/a}

## Bridge

- scale_url: $SCALE_URL
- status_http: $BRIDGE_STATUS_HTTP
- serial_aberta: ${SERIAL_ABERTA:-n/a}
- bridge_ok: $BRIDGE_OK

## OPS

- ops_url: $OPS_URL
- healthz_http: $OPS_HEALTHZ_HTTP
- api_status_http: $OPS_API_STATUS_HTTP
- ops_health_ok: $OPS_HEALTH_OK
- ops_api_ok: $OPS_API_OK

## Resultado

- overall_preflight_ok: $([[ "$BRIDGE_OK" == "true" && "$OPS_HEALTH_OK" == "true" && "$OPS_API_OK" == "true" ]] && echo true || echo false)

## Artefatos

- $(basename "$STATUS_JSON")
- $(basename "$HEALTHZ_JSON")
- $(basename "$API_STATUS_JSON")
- $(basename "$SUMMARY_JSON")
- $(basename "$SUMMARY_MD")
EOF

echo "Preflight concluido."
echo "Resumo markdown: $SUMMARY_MD"
echo "Resumo json: $SUMMARY_JSON"