#!/usr/bin/env bash
set -euo pipefail

# Smoke test for restaurante-ops rate limiting behavior.
# Validates 429 for threshold exceed and (optionally) 503 in strict-mode outage drills.

BASE_URL="${BASE_URL:-http://localhost:4040}"
TEST_EMAIL="${TEST_EMAIL:-rate-limit-smoke@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-wrong-password}"
ATTEMPTS="${ATTEMPTS:-10}"
LOGIN_PATH="${LOGIN_PATH:-/auth/login}"
BILLING_PATH="${BILLING_PATH:-/ops/billing/reconcile}"
COOKIE_FILE="${COOKIE_FILE:-/tmp/restaurante-ops-rate-limit.cookies}"
REPORT_FILE="${REPORT_FILE:-}"

# Optional billing validation inputs.
AUTH_COOKIE="${AUTH_COOKIE:-}"
BILLING_JSON="${BILLING_JSON:-}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ -n "$REPORT_FILE" ]]; then
  report_dir="$(dirname "$REPORT_FILE")"
  mkdir -p "$report_dir"
  exec > >(tee -a "$REPORT_FILE") 2>&1
  echo "[INFO] Report file: $REPORT_FILE"
  echo "[INFO] Started at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
fi

login_headers="$TMP_DIR/login.headers"
login_body="$TMP_DIR/login.body"
billing_headers="$TMP_DIR/billing.headers"
billing_body="$TMP_DIR/billing.body"

function print_header() {
  echo ""
  echo "== $1 =="
}

function assert_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"
  if ! grep -qi "$pattern" "$file"; then
    echo "[FAIL] $message"
    echo "------- file dump -------"
    cat "$file"
    echo "-------------------------"
    exit 1
  fi
}

function hit_login_once() {
  local code
  code="$(curl -sS -o "$login_body" -D "$login_headers" -w "%{http_code}" \
    -X POST "$BASE_URL$LOGIN_PATH" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "email=$TEST_EMAIL&password=$TEST_PASSWORD")"
  echo "$code"
}

print_header "Login rate-limit smoke ($BASE_URL$LOGIN_PATH)"
echo "Using ATTEMPTS=$ATTEMPTS email=$TEST_EMAIL"

last_code=""
for i in $(seq 1 "$ATTEMPTS"); do
  code="$(hit_login_once)"
  echo "Attempt $i -> HTTP $code"
  last_code="$code"
done

if [[ "$last_code" != "429" ]]; then
  echo "[FAIL] Expected last login attempt to return 429, got $last_code"
  exit 1
fi

assert_contains "$login_headers" "Retry-After" "429 login response must include Retry-After"
assert_contains "$login_headers" "X-RateLimit-Remaining" "429 login response must include X-RateLimit-Remaining"
assert_contains "$login_headers" "X-RateLimit-Reset" "429 login response must include X-RateLimit-Reset"

echo "[PASS] Login endpoint returned 429 with expected headers"
echo "[INFO] Login headers:"
cat "$login_headers"

if [[ -z "$AUTH_COOKIE" || -z "$BILLING_JSON" ]]; then
  print_header "Billing validation skipped"
  echo "Set AUTH_COOKIE and BILLING_JSON to validate billing rate limiting."
  echo "Example:"
  echo "  AUTH_COOKIE='ops_session=<token>' BILLING_JSON='{\"companyId\":\"...\",\"idempotencyKey\":\"...\",\"eventType\":\"payment_received\",\"paymentStatus\":\"paid\"}' BASE_URL=$BASE_URL $0"
  exit 0
fi

print_header "Billing rate-limit smoke ($BASE_URL$BILLING_PATH)"

billing_last_code=""
for i in $(seq 1 "$ATTEMPTS"); do
  billing_code="$(curl -sS -o "$billing_body" -D "$billing_headers" -w "%{http_code}" \
    -X POST "$BASE_URL$BILLING_PATH" \
    -H "Content-Type: application/json" \
    -H "Cookie: $AUTH_COOKIE" \
    --data "$BILLING_JSON")"
  echo "Billing attempt $i -> HTTP $billing_code"
  billing_last_code="$billing_code"
done

if [[ "$billing_last_code" == "429" ]]; then
  assert_contains "$billing_headers" "Retry-After" "429 billing response must include Retry-After"
  assert_contains "$billing_headers" "X-RateLimit-Remaining" "429 billing response must include X-RateLimit-Remaining"
  assert_contains "$billing_headers" "X-RateLimit-Reset" "429 billing response must include X-RateLimit-Reset"
  echo "[PASS] Billing endpoint returned 429 with expected headers"
  echo "[INFO] Billing headers:"
  cat "$billing_headers"
  exit 0
fi

if [[ "$billing_last_code" == "503" ]]; then
  assert_contains "$billing_body" "Servico temporariamente indisponivel" "503 billing response should indicate temporary unavailability"
  echo "[PASS] Billing endpoint returned 503 (strict fail-closed behavior)"
  echo "[INFO] Billing headers:"
  cat "$billing_headers"
  echo "[INFO] Billing body:"
  cat "$billing_body"
  exit 0
fi

echo "[FAIL] Expected billing last response to be 429 or 503, got $billing_last_code"
echo "Response body:"
cat "$billing_body"
exit 1
