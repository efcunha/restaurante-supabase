#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/billing-smoke-test.sh"
"$SCRIPT_DIR/billing-audit-check.sh"

echo "Full billing verification passed."
