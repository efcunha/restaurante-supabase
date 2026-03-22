#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required." >&2
  exit 1
fi

if ! command -v date >/dev/null 2>&1; then
  echo "ERROR: date is required." >&2
  exit 1
fi

SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
USER_JWT="${USER_JWT:-}"
WINDOW_MINUTES="${BILLING_AUDIT_WINDOW_MINUTES:-60}"

if [[ -z "$SUPABASE_PROJECT_URL" ]]; then
  echo "ERROR: SUPABASE_PROJECT_URL is not set." >&2
  exit 1
fi

if [[ -z "$SUPABASE_ANON_KEY" ]]; then
  echo "ERROR: SUPABASE_ANON_KEY is not set." >&2
  exit 1
fi

if [[ -z "$USER_JWT" ]]; then
  echo "ERROR: USER_JWT is not set." >&2
  exit 1
fi

if [[ "$SUPABASE_PROJECT_URL" == */ ]]; then
  SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL%/}"
fi

SINCE_UTC="$(date -u -d "-${WINDOW_MINUTES} minutes" +"%Y-%m-%dT%H:%M:%SZ")"
ENDPOINT="$SUPABASE_PROJECT_URL/rest/v1/billing_audit_log"

tmp_body="$(mktemp)"
http="$(curl -sS -G -o "$tmp_body" -w "%{http_code}" "$ENDPOINT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  --data-urlencode "select=event_type,actor_type,created_at,details" \
  --data-urlencode "event_type=in.(billing.checkout.requested,billing.pix.requested)" \
  --data-urlencode "created_at=gte.$SINCE_UTC" \
  --data-urlencode "order=created_at.desc" \
  --data-urlencode "limit=50")"

printf "\n=== billing_audit_log check ===\n"
printf "HTTP: %s\n" "$http"
printf "Window start (UTC): %s\n" "$SINCE_UTC"
cat "$tmp_body"
printf "\n"

if [[ "$http" -ge 400 ]]; then
  rm -f "$tmp_body"
  echo "Audit check failed (HTTP >= 400)." >&2
  exit 1
fi

checkout_count="$(grep -o 'billing.checkout.requested' "$tmp_body" | wc -l | tr -d ' ')"
pix_count="$(grep -o 'billing.pix.requested' "$tmp_body" | wc -l | tr -d ' ')"

rm -f "$tmp_body"

printf "checkout.requested count: %s\n" "$checkout_count"
printf "pix.requested count: %s\n" "$pix_count"

if [[ "$checkout_count" -lt 1 || "$pix_count" -lt 1 ]]; then
  echo "Audit check did not find both expected events in the selected window." >&2
  exit 1
fi

echo "Audit check passed."
