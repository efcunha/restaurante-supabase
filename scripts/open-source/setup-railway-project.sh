#!/usr/bin/env bash
set -euo pipefail

# Setup guiado para vincular o repositorio a um projeto Railway sem credenciais hardcoded.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE="${RAILWAY_WORKSPACE:-}"
PROJECT="${RAILWAY_PROJECT:-}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-}"
SERVICE="${RAILWAY_SERVICE:-}"
NO_LOGIN="false"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-source/setup-railway-project.sh [options]

Options:
  --workspace <name>      Railway workspace name.
  --project <name>        Railway project name.
  --environment <name>    Railway environment name (ex: production).
  --service <name>        Optional Railway service name.
  --no-login              Do not trigger interactive railway login.
  -h, --help              Show help.

This script does not store secrets. It only links local repo metadata.
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing command: $cmd"
    exit 1
  fi
}

ask_if_empty() {
  local var_name="$1"
  local prompt_text="$2"
  local current_value="$3"
  if [ -n "$current_value" ]; then
    printf '%s' "$current_value"
    return 0
  fi
  read -r -p "$prompt_text" input
  printf '%s' "$input"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --workspace)
      WORKSPACE="${2:-}"
      shift
      ;;
    --project)
      PROJECT="${2:-}"
      shift
      ;;
    --environment)
      ENVIRONMENT="${2:-}"
      shift
      ;;
    --service)
      SERVICE="${2:-}"
      shift
      ;;
    --no-login)
      NO_LOGIN="true"
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

require_cmd railway

WORKSPACE="$(ask_if_empty "WORKSPACE" "Railway workspace: " "$WORKSPACE")"
PROJECT="$(ask_if_empty "PROJECT" "Railway project: " "$PROJECT")"
ENVIRONMENT="$(ask_if_empty "ENVIRONMENT" "Railway environment: " "$ENVIRONMENT")"

if [ -z "$WORKSPACE" ] || [ -z "$PROJECT" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Workspace, project and environment are required."
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  if [ "$NO_LOGIN" = "true" ]; then
    echo "Railway session not found and --no-login was provided."
    exit 1
  fi
  echo "No Railway session detected. Starting login..."
  railway login
fi

cd "$ROOT_DIR"

LINK_ARGS=(
  --workspace "$WORKSPACE"
  --project "$PROJECT"
  --environment "$ENVIRONMENT"
)

if [ -n "$SERVICE" ]; then
  LINK_ARGS+=(--service "$SERVICE")
fi

railway link "${LINK_ARGS[@]}"

echo ""
echo "Railway link completed."
echo "Recommended environment exports for current shell:"
echo "  export RAILWAY_WORKSPACE=\"$WORKSPACE\""
echo "  export RAILWAY_PROJECT=\"$PROJECT\""
echo "  export RAILWAY_ENVIRONMENT=\"$ENVIRONMENT\""
if [ -n "$SERVICE" ]; then
  echo "  export RAILWAY_SERVICE=\"$SERVICE\""
fi
