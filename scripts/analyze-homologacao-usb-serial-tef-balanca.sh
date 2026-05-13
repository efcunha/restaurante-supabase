#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUT_DIR="${1:-$ROOT_DIR/tmp/evidencias}"
EXPLICIT_FILE="${2:-}"
CSV_OUT_FILE="${3:-}"

node "$SCRIPT_DIR/analyze-homologacao-usb-serial-tef-balanca.mjs" "$OUT_DIR" "$EXPLICIT_FILE" "$CSV_OUT_FILE"
