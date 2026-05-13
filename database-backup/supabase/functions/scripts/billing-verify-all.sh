#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/billing-smoke-test.sh"
"$SCRIPT_DIR/billing-audit-check.sh"

echo ""
# Card tokenization test requires SUPABASE_ANON_KEY and a live MP sandbox; skip in CI without MP access
if [[ -z "${SKIP_CARD_TEST:-}" ]]; then
	echo "=== Running card tokenization test (MP_TEST_CARD=${MP_TEST_CARD:-mastercard}) ==="
	"$SCRIPT_DIR/billing-card-test.sh"
else
	echo "Card tokenization test skipped (SKIP_CARD_TEST is set)."
fi

echo ""
echo "Full billing verification passed."
