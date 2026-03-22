#!/usr/bin/env bash
# billing-webhook-test.sh
# Verifies billing-webhook HMAC-SHA256 signature authentication.
#
# Required env vars:
#   SUPABASE_PROJECT_URL  – Edge Function base URL
#   WEBHOOK_SECRET        – Value of MERCADOPAGO_WEBHOOK_SECRET (for signing test payloads)
#
# Optional:
#   PAYMENT_ID            – A real/sandbox MP payment id to test with (default: "test-pay-001")
#
# Usage:
#   SUPABASE_PROJECT_URL=https://<ref>.supabase.co \
#   WEBHOOK_SECRET=<secret> \
#   bash billing-webhook-test.sh

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl is required for HMAC signing." >&2
  exit 1
fi

SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"
PAYMENT_ID="${PAYMENT_ID:-test-pay-001}"

if [[ -z "$SUPABASE_PROJECT_URL" ]]; then
  echo "ERROR: SUPABASE_PROJECT_URL is not set." >&2
  exit 1
fi

if [[ -z "$WEBHOOK_SECRET" ]]; then
  echo "ERROR: WEBHOOK_SECRET is not set (must match MERCADOPAGO_WEBHOOK_SECRET)." >&2
  exit 1
fi

if [[ "$SUPABASE_PROJECT_URL" == */ ]]; then
  SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL%/}"
fi

URL="$SUPABASE_PROJECT_URL/functions/v1/billing-webhook"
ENDPOINT="/functions/v1/billing-webhook"

# --- helper: sign and post -----------------------------------------------
signed_post() {
  local description="$1"
  local x_request_id="$2"
  local data_id="$3"
  local payload="$4"
  local ts
  ts="$(date +%s)"

  local manifest="id:${data_id};request-id:${x_request_id};ts:${ts}"
  local signature
  signature="$(printf '%s' "$manifest" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

  local tmp_body
  tmp_body="$(mktemp)"

  local http
  http="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "x-signature: ts=${ts},v1=${signature}" \
    -H "x-request-id: ${x_request_id}" \
    -d "$payload")"

  echo ""
  echo "=== $description ==="
  echo "HTTP: $http"
  cat "$tmp_body"
  echo ""

  rm -f "$tmp_body"
  echo "$http"
}

passed=0
failed=0

# --- Test 1: Unsigned POST must return 401 ---------------------------------
echo "--- Test 1: Unsigned POST (no x-signature header) ---"
http_1="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.updated","data":{"id":"0"}}')"
echo "HTTP: $http_1"
if [[ "$http_1" == "401" ]]; then
  echo "  [PASS] Unsigned request rejected with 401"
  passed=$((passed + 1))
else
  echo "  [FAIL] Expected 401, got $http_1"
  failed=$((failed + 1))
fi

# --- Test 2: Wrong signature must return 401 ------------------------------
echo ""
echo "--- Test 2: Wrong signature (tampered HMAC) ---"
TS_NOW="$(date +%s)"
REQ_ID="test-req-bad-sig"
BAD_SIG="0000000000000000000000000000000000000000000000000000000000000000"
http_2="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS_NOW},v1=${BAD_SIG}" \
  -H "x-request-id: ${REQ_ID}" \
  -d "{\"action\":\"payment.updated\",\"data\":{\"id\":\"${PAYMENT_ID}\"}}")"
echo "HTTP: $http_2"
if [[ "$http_2" == "401" ]]; then
  echo "  [PASS] Tampered signature rejected with 401"
  passed=$((passed + 1))
else
  echo "  [FAIL] Expected 401, got $http_2"
  failed=$((failed + 1))
fi

# --- Test 3: Replayed timestamp (>5 min old) must return 401 --------------
echo ""
echo "--- Test 3: Replayed timestamp (6 minutes ago) ---"
TS_OLD="$(( $(date +%s) - 360 ))"
REQ_ID_OLD="test-req-replay"
DATA_ID_OLD="${PAYMENT_ID}"
MANIFEST_OLD="id:${DATA_ID_OLD};request-id:${REQ_ID_OLD};ts:${TS_OLD}"
SIG_OLD="$(printf '%s' "$MANIFEST_OLD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"
http_3="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS_OLD},v1=${SIG_OLD}" \
  -H "x-request-id: ${REQ_ID_OLD}" \
  -d "{\"action\":\"payment.updated\",\"data\":{\"id\":\"${DATA_ID_OLD}\"}}")"
echo "HTTP: $http_3"
if [[ "$http_3" == "401" ]]; then
  echo "  [PASS] Replayed (stale) request rejected with 401"
  passed=$((passed + 1))
else
  echo "  [FAIL] Expected 401, got $http_3"
  failed=$((failed + 1))
fi

# --- Test 4: Valid signed POST (will likely return 200 or payment-fetch error) ---
echo ""
echo "--- Test 4: Valid HMAC signature (expect 200 or known downstream error) ---"
REQ_ID_OK="test-req-$(date +%s)"
DATA_ID_OK="${PAYMENT_ID}"
PAYLOAD_OK="{\"action\":\"payment.updated\",\"data\":{\"id\":\"${DATA_ID_OK}\"}}"
TS_OK="$(date +%s)"
MANIFEST_OK="id:${DATA_ID_OK};request-id:${REQ_ID_OK};ts:${TS_OK}"
SIG_OK="$(printf '%s' "$MANIFEST_OK" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

tmp_body_4="$(mktemp)"
http_4="$(curl -sS -o "$tmp_body_4" -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS_OK},v1=${SIG_OK}" \
  -H "x-request-id: ${REQ_ID_OK}" \
  -d "$PAYLOAD_OK")"
echo "HTTP: $http_4"
cat "$tmp_body_4"
echo ""
rm -f "$tmp_body_4"

# 200 = processed; non-401 means the function accepted the signed request
if [[ "$http_4" != "401" ]]; then
  echo "  [PASS] Signed request accepted (HTTP $http_4 — not a signature rejection)"
  passed=$((passed + 1))
else
  echo "  [FAIL] Valid signature was rejected with 401"
  failed=$((failed + 1))
fi

# --- Summary ---------------------------------------------------------------
echo ""
echo "==============================="
echo "Webhook signature tests: PASS=$passed  FAIL=$failed"
echo "==============================="

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi
