#!/usr/bin/env bash
set -euo pipefail

# Preflight de ambiente para onboarding open source.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STRICT_DEPLOY="false"
HAS_ERRORS="false"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-source/setup-preflight-check.sh [--strict-deploy]

Options:
  --strict-deploy   Fail if deploy prerequisites are missing.
  -h, --help        Show help.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --strict-deploy)
      STRICT_DEPLOY="true"
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Invalid option: $1"
      print_usage
      exit 1
      ;;
  esac
  shift
done

ok() {
  echo "[OK] $1"
}

warn() {
  echo "[WARN] $1"
}

err() {
  echo "[ERROR] $1"
  HAS_ERRORS="true"
}

check_cmd() {
  local cmd="$1"
  local label="$2"
  local required="$3"

  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$label found"
  else
    if [ "$required" = "required" ]; then
      err "$label missing"
    else
      warn "$label missing"
      if [ "$STRICT_DEPLOY" = "true" ]; then
        err "$label is required in --strict-deploy mode"
      fi
    fi
  fi
}

check_file() {
  local file_path="$1"
  local required="$2"
  if [ -f "$file_path" ]; then
    ok "File present: $file_path"
  else
    if [ "$required" = "required" ]; then
      err "Missing file: $file_path"
    else
      warn "Missing file: $file_path"
    fi
  fi
}

check_env() {
  local var_name="$1"
  local required="$2"
  local var_value="${!var_name:-}"
  if [ -n "$var_value" ]; then
    ok "Env set: $var_name"
  else
    if [ "$required" = "required" ]; then
      err "Missing env: $var_name"
    else
      warn "Missing env: $var_name"
    fi
  fi
}

echo "== Tooling checks =="
check_cmd node "Node.js" required
check_cmd pnpm "pnpm" required
check_cmd git "Git" required
check_cmd railway "Railway CLI" optional
check_cmd supabase "Supabase CLI" optional
check_cmd eas "EAS CLI" optional

echo ""
echo "== Environment file checks =="
check_file "$ROOT_DIR/restaurante-app/.env.example" required
check_file "$ROOT_DIR/restaurante-web/.env.example" required
check_file "$ROOT_DIR/restaurante-ops/.env.example" required
check_file "$ROOT_DIR/restaurante-site/.env.example" required
check_file "$ROOT_DIR/database-backup/.env.example" required

check_file "$ROOT_DIR/restaurante-app/.env.local" optional
check_file "$ROOT_DIR/restaurante-web/.env.local" optional
check_file "$ROOT_DIR/restaurante-ops/.env.local" optional
check_file "$ROOT_DIR/restaurante-site/.env.local" optional
check_file "$ROOT_DIR/database-backup/.env.local" optional

echo ""
echo "== Deploy environment checks =="
if [ "$STRICT_DEPLOY" = "true" ]; then
  check_env RAILWAY_WORKSPACE required
  check_env RAILWAY_PROJECT required
  check_env RAILWAY_ENVIRONMENT required
else
  check_env RAILWAY_WORKSPACE optional
  check_env RAILWAY_PROJECT optional
  check_env RAILWAY_ENVIRONMENT optional
fi

if [ "$HAS_ERRORS" = "true" ]; then
  echo ""
  echo "Preflight finished with errors."
  exit 1
fi

echo ""
echo "Preflight passed."
