#!/usr/bin/env bash
# =============================================================================
# billing-card-test.sh
# Full card tokenization smoke test using Mercado Pago test cards.
#
# Flow:
#   1. Call billing-create-checkout (Mode A) → get publicKey
#   2. Call MP /v1/card_tokens with test card data → get cardToken
#   3. Call billing-create-checkout (Mode B) with cardToken → card saved
#   4. Verify payment_methods table via REST
#
# Required env vars:
#   SUPABASE_PROJECT_URL   — e.g. https://<ref>.supabase.co
#   SUPABASE_ANON_KEY      — for REST reads
#   USER_JWT               — valid admin user JWT
#
# Optional:
#   MP_TEST_CARD           — mastercard (default) | visa | amex | elo
# =============================================================================
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required for JSON parsing in this script." >&2
  exit 1
fi

SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
USER_JWT="${USER_JWT:-}"
MP_TEST_CARD="${MP_TEST_CARD:-mastercard}"
MP_ACCESS_TOKEN="${MP_ACCESS_TOKEN:-}"

if [[ -z "$SUPABASE_PROJECT_URL" ]] || [[ -z "$SUPABASE_ANON_KEY" ]] || [[ -z "$USER_JWT" ]]; then
  echo "ERROR: SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY and USER_JWT must all be set." >&2
  exit 1
fi

if [[ -z "$MP_ACCESS_TOKEN" ]]; then
  echo "ERROR: MP_ACCESS_TOKEN must be set (requires Mercado Pago Access Token for card tokenization)." >&2
  exit 1
fi

SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL%/}"

# ---------------------------------------------------------------------------
# Test card definitions (Mercado Pago sandbox)
# https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards
# ---------------------------------------------------------------------------
case "$MP_TEST_CARD" in
  mastercard)
    CARD_NUMBER="5031433215406351"
    CARD_CVV="123"
    CARD_EXPIRY_MONTH=11
    CARD_EXPIRY_YEAR=2030
    CARD_HOLDER="APRO CUSTOMER"
    ;;
  visa)
    CARD_NUMBER="4235647728025682"
    CARD_CVV="123"
    CARD_EXPIRY_MONTH=11
    CARD_EXPIRY_YEAR=2030
    CARD_HOLDER="APRO CUSTOMER"
    ;;
  amex)
    CARD_NUMBER="375365153556885"
    CARD_CVV="1234"
    CARD_EXPIRY_MONTH=11
    CARD_EXPIRY_YEAR=2030
    CARD_HOLDER="APRO CUSTOMER"
    ;;
  elo)
    CARD_NUMBER="5067766783888311"
    CARD_CVV="123"
    CARD_EXPIRY_MONTH=11
    CARD_EXPIRY_YEAR=2030
    CARD_HOLDER="APRO CUSTOMER"
    ;;
  *)
    echo "ERROR: MP_TEST_CARD must be mastercard | visa | amex | elo" >&2
    exit 1
    ;;
esac

MP_API="${MERCADOPAGO_API_BASE_URL:-https://api.mercadopago.com}"
PASS=0
FAIL=0

step_pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
step_fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }

json_eval() {
  local expr="$1"
  local file="$2"
  node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const fn = new Function('data', 'return (' + process.argv[2] + ');');
const value = fn(data);
if (value === undefined || value === null) {
  process.stdout.write('');
} else if (typeof value === 'object') {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
" "$file" "$expr"
}

# ---------------------------------------------------------------------------
# STEP 1 — Get public key from billing-create-checkout (Mode A)
# ---------------------------------------------------------------------------
echo ""
echo "=== STEP 1: billing-create-checkout (Mode A — get publicKey) ==="

TMP1="$(mktemp)"
HTTP1="$(curl -sS -o "$TMP1" -w "%{http_code}" \
  "$SUPABASE_PROJECT_URL/functions/v1/billing-create-checkout" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{}')"

echo "HTTP: $HTTP1"
cat "$TMP1"; echo ""

if [[ "$HTTP1" == "200" ]]; then
  CHECKOUT_STATUS="$(json_eval "data.status ?? ''" "$TMP1")"
  PUBLIC_KEY="$(json_eval "data.publicKey ?? ''" "$TMP1")"

  if [[ "$CHECKOUT_STATUS" == "ready_for_tokenization" ]] && [[ -n "$PUBLIC_KEY" ]]; then
    step_pass "Mode A returned status=ready_for_tokenization with publicKey"
  elif [[ "$CHECKOUT_STATUS" == "provider_not_ready" ]]; then
    step_fail "Provider not ready (MERCADOPAGO_PUBLIC_KEY or MERCADOPAGO_ACCESS_TOKEN not configured)"
    echo "  Skipping card tokenization steps — configure secrets first." >&2
    rm -f "$TMP1"
    exit 1
  else
    step_fail "Unexpected status: $CHECKOUT_STATUS (publicKey: $PUBLIC_KEY)"
    rm -f "$TMP1"
    exit 1
  fi
else
  step_fail "billing-create-checkout returned HTTP $HTTP1"
  rm -f "$TMP1"
  exit 1
fi
rm -f "$TMP1"

# ---------------------------------------------------------------------------
# STEP 2 — Tokenize test card directly with Mercado Pago
# ---------------------------------------------------------------------------
echo ""
echo "=== STEP 2: Tokenize $MP_TEST_CARD test card with MP /v1/card_tokens ==="

TOKENIZE_PAYLOAD="$(cat <<EOF
{
  "card_number": "${CARD_NUMBER}",
  "expiration_month": ${CARD_EXPIRY_MONTH},
  "expiration_year": ${CARD_EXPIRY_YEAR},
  "security_code": "${CARD_CVV}",
  "cardholder": { "name": "${CARD_HOLDER}" }
}
EOF
)"

TMP2="$(mktemp)"
HTTP2="$(curl -sS -o "$TMP2" -w "%{http_code}" \
  "$MP_API/v1/card_tokens" \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TOKENIZE_PAYLOAD")"

echo "HTTP: $HTTP2"
cat "$TMP2"; echo ""

if [[ "$HTTP2" == "200" ]] || [[ "$HTTP2" == "201" ]]; then
  CARD_TOKEN="$(json_eval "data.id ?? ''" "$TMP2")"
  if [[ -n "$CARD_TOKEN" ]]; then
    step_pass "card_tokens returned token: ${CARD_TOKEN:0:12}..."
  else
    step_fail "card_tokens did not return an id"
    rm -f "$TMP2"
    exit 1
  fi
else
  ERROR_MSG="$(json_eval "data.message ?? ''" "$TMP2")"
  step_fail "MP card_tokens returned HTTP $HTTP2: $ERROR_MSG"
  rm -f "$TMP2"
  exit 1
fi
rm -f "$TMP2"

# ---------------------------------------------------------------------------
# STEP 3 — Save card token via billing-create-checkout (Mode B)
# ---------------------------------------------------------------------------
echo ""
echo "=== STEP 3: billing-create-checkout (Mode B — save card token) ==="

SAVE_PAYLOAD="{\"cardToken\": \"${CARD_TOKEN}\"}"
TMP3="$(mktemp)"
HTTP3="$(curl -sS -o "$TMP3" -w "%{http_code}" \
  "$SUPABASE_PROJECT_URL/functions/v1/billing-create-checkout" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d "$SAVE_PAYLOAD")"

echo "HTTP: $HTTP3"
cat "$TMP3"; echo ""

PM_ID=""
if [[ "$HTTP3" == "201" ]]; then
  SAVE_STATUS="$(json_eval "data.status ?? ''" "$TMP3")"
  PM_ID="$(json_eval "data.paymentMethodId ?? ''" "$TMP3")"
  CARD_BRAND="$(json_eval "(data.card && data.card.brand) ? data.card.brand : ''" "$TMP3")"
  CARD_LAST4="$(json_eval "(data.card && data.card.lastFour) ? data.card.lastFour : ''" "$TMP3")"

  if [[ "$SAVE_STATUS" == "card_saved" ]] && [[ -n "$PM_ID" ]]; then
    step_pass "card_saved: brand=$CARD_BRAND lastFour=$CARD_LAST4 paymentMethodId=$PM_ID"
  else
    step_fail "Expected status=card_saved but got: $SAVE_STATUS"
  fi
elif [[ "$HTTP3" == "409" ]]; then
  ERROR_MSG="$(json_eval "data.error ?? ''" "$TMP3")"
  echo "  [SKIP] Mode B returned 409 (no subscription yet): $ERROR_MSG"
  echo "         STEP 3 and STEP 4 require an active subscription — set one up to fully validate."
  rm -f "$TMP3"
else
  ERROR_MSG="$(json_eval "data.error ?? ''" "$TMP3")"
  step_fail "billing-create-checkout Mode B returned HTTP $HTTP3: $ERROR_MSG"
  rm -f "$TMP3"
  exit 1
fi
rm -f "$TMP3"

# ---------------------------------------------------------------------------
# STEP 4 — Verify payment_methods row exists via Supabase REST
# ---------------------------------------------------------------------------
echo ""
echo "=== STEP 4: Verify payment_methods row via REST ==="

if [[ -z "$PM_ID" ]]; then
  echo "  [SKIP] No paymentMethodId from STEP 3 — skipping REST verification."
else
TMP4="$(mktemp)"
HTTP4="$(curl -sS -G -o "$TMP4" -w "%{http_code}" \
  "$SUPABASE_PROJECT_URL/rest/v1/payment_methods" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  --data-urlencode "id=eq.$PM_ID" \
  --data-urlencode "select=id,type,brand,last_four,expiry_month,expiry_year,is_default,mp_card_id")"

echo "HTTP: $HTTP4"
cat "$TMP4"; echo ""

if [[ "$HTTP4" == "200" ]]; then
  ROW_COUNT="$(json_eval "Array.isArray(data) ? data.length : 0" "$TMP4")"
  if [[ "$ROW_COUNT" -ge 1 ]]; then
    IS_DEFAULT="$(json_eval "Array.isArray(data) && data[0] ? data[0].is_default : ''" "$TMP4")"
    STORED_BRAND="$(json_eval "Array.isArray(data) && data[0] ? (data[0].brand ?? '') : ''" "$TMP4")"
    MP_CARD_ID="$(json_eval "Array.isArray(data) && data[0] ? (data[0].mp_card_id ?? '') : ''" "$TMP4")"
    step_pass "payment_methods row found: brand=$STORED_BRAND is_default=$IS_DEFAULT mp_card_id=${MP_CARD_ID:0:8}..."
  else
    step_fail "payment_methods row not found for id=$PM_ID"
  fi
else
  step_fail "REST query returned HTTP $HTTP4"
fi
rm -f "$TMP4"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================="
echo "  PASS: $PASS  |  FAIL: $FAIL"
echo "=============================="

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "Card tokenization test passed for $MP_TEST_CARD."
