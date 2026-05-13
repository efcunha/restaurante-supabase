#!/usr/bin/env bash
set -euo pipefail

# Setup guiado para vincular projeto Supabase localmente e, opcionalmente, aplicar migrations.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_DIR="$ROOT_DIR/database-backup/supabase"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
APPLY_MIGRATIONS="false"
NO_LOGIN="false"
SKIP_LINK="false"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-source/setup-supabase-project.sh [options]

Options:
  --project-ref <ref>     Supabase project ref.
  --db-dir <path>         Directory containing Supabase config (default: database-backup/supabase).
  --apply-migrations      Run supabase db push after link.
  --skip-link             Skip project link step.
  --no-login              Do not trigger interactive supabase login.
  -h, --help              Show help.
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
  local current_value="$1"
  local prompt_text="$2"
  if [ -n "$current_value" ]; then
    printf '%s' "$current_value"
    return 0
  fi
  read -r -p "$prompt_text" input
  printf '%s' "$input"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --project-ref)
      PROJECT_REF="${2:-}"
      shift
      ;;
    --db-dir)
      DB_DIR="${2:-}"
      shift
      ;;
    --apply-migrations)
      APPLY_MIGRATIONS="true"
      ;;
    --skip-link)
      SKIP_LINK="true"
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

require_cmd supabase

if [ ! -d "$DB_DIR" ]; then
  echo "Supabase directory not found: $DB_DIR"
  exit 1
fi

if ! supabase projects list >/dev/null 2>&1; then
  if [ "$NO_LOGIN" = "true" ]; then
    echo "Supabase session not found and --no-login was provided."
    exit 1
  fi
  echo "No Supabase session detected. Starting login..."
  supabase login
fi

if [ "$SKIP_LINK" != "true" ]; then
  PROJECT_REF="$(ask_if_empty "$PROJECT_REF" "Supabase project ref: ")"
  if [ -z "$PROJECT_REF" ]; then
    echo "Project ref is required unless --skip-link is used."
    exit 1
  fi

  (
    cd "$DB_DIR"
    supabase link --project-ref "$PROJECT_REF"
  )
fi

if [ "$APPLY_MIGRATIONS" = "true" ]; then
  (
    cd "$DB_DIR"
    supabase db push
  )
fi

echo ""
echo "Supabase setup completed."
if [ -n "$PROJECT_REF" ]; then
  echo "Project ref: $PROJECT_REF"
fi
if [ "$APPLY_MIGRATIONS" = "true" ]; then
  echo "Migrations were applied via supabase db push."
fi
