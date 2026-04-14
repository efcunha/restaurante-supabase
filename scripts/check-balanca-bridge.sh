#!/bin/bash

set -euo pipefail

SCALE_URL="${SCALE_URL:-http://localhost:3031}"
API_KEY="${API_KEY:-}"
RETRIES="${RETRIES:-5}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-2}"

STATUS_FILE="${STATUS_FILE:-}"
if [[ -z "$STATUS_FILE" ]]; then
  STATUS_FILE="$(mktemp)"
fi

API_HEADERS=()
if [[ -n "$API_KEY" ]]; then
  API_HEADERS=(-H "x-api-key: $API_KEY")
fi

attempt=1
ok="false"
http_code="000"

while [[ $attempt -le $RETRIES ]]; do
  set +e
  http_code="$(curl -sS -o "$STATUS_FILE" -w "%{http_code}" "${API_HEADERS[@]}" "$SCALE_URL/status")"
  curl_exit=$?
  set -e

  if [[ $curl_exit -eq 0 && "$http_code" == "200" ]]; then
    ok="true"
    break
  fi

  echo "[bridge-check] tentativa $attempt/$RETRIES falhou (http=$http_code)."
  if [[ $attempt -lt $RETRIES ]]; then
    sleep "$RETRY_DELAY_SECONDS"
  fi
  attempt=$((attempt + 1))
done

serial_aberta=""
porta=""
baud=""
protocolo=""

if command -v node >/dev/null 2>&1; then
  serial_aberta="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.serial_aberta ?? ''));}catch{process.stdout.write('');}" "$STATUS_FILE")"
  porta="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.porta ?? ''));}catch{process.stdout.write('');}" "$STATUS_FILE")"
  baud="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.baud ?? ''));}catch{process.stdout.write('');}" "$STATUS_FILE")"
  protocolo="$(node -e "const fs=require('fs');try{const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(j.protocolo ?? ''));}catch{process.stdout.write('');}" "$STATUS_FILE")"
fi

echo "bridge_url=$SCALE_URL"
echo "http_code=$http_code"
echo "ok=$ok"
echo "serial_aberta=${serial_aberta:-n/a}"
echo "porta=${porta:-n/a}"
echo "baud=${baud:-n/a}"
echo "protocolo=${protocolo:-n/a}"

if [[ "$ok" != "true" ]]; then
  exit 1
fi
