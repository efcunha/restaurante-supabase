#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OPS_URL="${OPS_URL:-https://ops.restaurante-web.app.br}"
BASE_URL="${BASE_URL:-https://restaurante-web.app.br}"
OUT_DIR="$WEB_ROOT/tmp/evidencias"

mkdir -p "$OUT_DIR"

STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_FILE="$(date -u +"%Y%m%dT%H%M%SZ")"

HEALTHZ_JSON="$OUT_DIR/ops-healthz-$STAMP_FILE.json"
STATUS_JSON="$OUT_DIR/ops-status-$STAMP_FILE.json"
SUMMARY_MD="$OUT_DIR/tef-go-live-snapshot-$STAMP_FILE.md"

HEALTHZ_HTTP="$(curl -sS -o "$HEALTHZ_JSON" -w "%{http_code}" "$OPS_URL/healthz")"
STATUS_HTTP="$(curl -sS -o "$STATUS_JSON" -w "%{http_code}" "$OPS_URL/api/status")"

if [[ "$HEALTHZ_HTTP" != "200" || "$STATUS_HTTP" != "200" ]]; then
  echo "Falha no snapshot operacional: /healthz=$HEALTHZ_HTTP /api/status=$STATUS_HTTP"
  exit 1
fi

cd "$WEB_ROOT"

bash scripts/run-tef14-15-auto.sh \
  --all \
  --base-url "$BASE_URL" \
  --ops-url "$OPS_URL" \
  --json-out tmp/evidencias/tef14-15-int-real.json \
  --summary-md tmp/evidencias/tef14-15-int-real.md

cat > "$SUMMARY_MD" <<EOF
# Snapshot TEF Go-Live

- Timestamp UTC: $STAMP_UTC
- Base URL: $BASE_URL
- Ops URL: $OPS_URL
- healthz HTTP: $HEALTHZ_HTTP
- api/status HTTP: $STATUS_HTTP
- healthz payload: tmp/evidencias/$(basename "$HEALTHZ_JSON")
- status payload: tmp/evidencias/$(basename "$STATUS_JSON")
- evidencia tef json: tmp/evidencias/tef14-15-int-real.json
- evidencia tef md: tmp/evidencias/tef14-15-int-real.md
EOF

echo "Snapshot concluido."
echo "Resumo: $SUMMARY_MD"
