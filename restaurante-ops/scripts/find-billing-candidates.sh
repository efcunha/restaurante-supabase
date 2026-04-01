#!/usr/bin/env bash
set -euo pipefail

COMPANY_ID=""
LIMIT="20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --company-id)
      COMPANY_ID="${2:-}"
      shift 2
      ;;
    --limit)
      LIMIT="${2:-20}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure .env exists or env vars are exported." >&2
  exit 1
fi

BASE_URL="${SUPABASE_URL%/}/rest/v1/invoices"
QUERY="select=id,company_id,status,amount,due_date,retry_count,payment_method_type&status=in.(pending,failed)&order=due_date.asc&limit=${LIMIT}"

if [[ -n "$COMPANY_ID" ]]; then
  QUERY+="&company_id=eq.${COMPANY_ID}"
fi

RESPONSE="$(curl -sS "${BASE_URL}?${QUERY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"

if [[ "$RESPONSE" == "[]" ]]; then
  COMPANY_ID_JSON='null'
  if [[ -n "$COMPANY_ID" ]]; then
    COMPANY_ID_JSON="\"$COMPANY_ID\""
  fi
  printf '{\n  "ok": true,\n  "count": 0,\n  "message": "No pending/failed invoices found for OPS-4 success-path smoke.",\n  "companyId": %s\n}\n' "$COMPANY_ID_JSON"
  exit 0
fi

echo "$RESPONSE"