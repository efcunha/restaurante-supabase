#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required." >&2
  exit 1
fi

SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
USER_JWT="${USER_JWT:-}"

if [[ -z "$SUPABASE_PROJECT_URL" ]]; then
  echo "ERROR: SUPABASE_PROJECT_URL is not set." >&2
  exit 1
fi

if [[ -z "$USER_JWT" ]]; then
  echo "ERROR: USER_JWT is not set." >&2
  exit 1
fi

if [[ "$SUPABASE_PROJECT_URL" == */ ]]; then
  SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL%/}"
fi

call_function() {
  local fn_name="$1"
  local payload="${2:-{}}"
  local tmp_body
  local http

  tmp_body="$(mktemp)"
  http="$(curl -sS -o "$tmp_body" -w "%{http_code}" \
    "$SUPABASE_PROJECT_URL/functions/v1/$fn_name" \
    -H "Authorization: Bearer $USER_JWT" \
    -H "Content-Type: application/json" \
    -d "$payload")"

  echo ""
  echo "=== $fn_name ==="
  echo "HTTP: $http"
  cat "$tmp_body"
  echo ""

  rm -f "$tmp_body"

  if [[ "$http" -ge 400 ]]; then
    return 1
  fi

  return 0
}

failed=0

call_function "billing-provider-status" "{}" || failed=1
call_function "billing-create-checkout" "{}" || failed=1
call_function "billing-create-pix-fallback" "{}" || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo "Smoke test finished with at least one failing function." >&2
  exit 1
fi

echo "Smoke test finished successfully."
