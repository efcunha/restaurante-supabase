#!/usr/bin/env bash
set -euo pipefail

# Orquestra deploy dos servicos Railway do monorepo sem credenciais embutidas.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_OPS="true"
DEPLOY_WEB="true"
DEPLOY_SITE="true"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-source/deploy-railway-all.sh [options]

Options:
  --ops-only        Deploy only restaurante-ops
  --web-only        Deploy only restaurante-web
  --site-only       Deploy only restaurante-site
  --skip-ops        Skip restaurante-ops
  --skip-web        Skip restaurante-web
  --skip-site       Skip restaurante-site
  -h, --help        Show help

Required env vars:
  RAILWAY_WORKSPACE
  RAILWAY_PROJECT
  RAILWAY_ENVIRONMENT
EOF
}

require_env_var() {
  local var_name="$1"
  local var_value="${!var_name:-}"

  if [ -z "$var_value" ]; then
    echo "Missing required variable: $var_name"
    exit 1
  fi
}

set_only_mode() {
  DEPLOY_OPS="false"
  DEPLOY_WEB="false"
  DEPLOY_SITE="false"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ops-only)
      set_only_mode
      DEPLOY_OPS="true"
      ;;
    --web-only)
      set_only_mode
      DEPLOY_WEB="true"
      ;;
    --site-only)
      set_only_mode
      DEPLOY_SITE="true"
      ;;
    --skip-ops)
      DEPLOY_OPS="false"
      ;;
    --skip-web)
      DEPLOY_WEB="false"
      ;;
    --skip-site)
      DEPLOY_SITE="false"
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

require_env_var "RAILWAY_WORKSPACE"
require_env_var "RAILWAY_PROJECT"
require_env_var "RAILWAY_ENVIRONMENT"

if [ "$DEPLOY_OPS" = "false" ] && [ "$DEPLOY_WEB" = "false" ] && [ "$DEPLOY_SITE" = "false" ]; then
  echo "Nothing selected for deploy."
  exit 1
fi

if [ "$DEPLOY_OPS" = "true" ]; then
  echo "[DEPLOY] restaurante-ops"
  (
    cd "$ROOT_DIR/restaurante-ops"
    bash ./scripts/deploy-railway.sh
  )
fi

if [ "$DEPLOY_WEB" = "true" ]; then
  echo "[DEPLOY] restaurante-web"
  (
    cd "$ROOT_DIR/restaurante-web"
    bash ./scripts/deploy-railway.sh
  )
fi

if [ "$DEPLOY_SITE" = "true" ]; then
  echo "[DEPLOY] restaurante-site"
  (
    cd "$ROOT_DIR/restaurante-site"
    bash ./scripts/deploy-railway.sh
  )
fi

echo "Deploy orchestration finished."
