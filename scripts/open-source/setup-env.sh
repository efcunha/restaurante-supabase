#!/usr/bin/env bash
set -euo pipefail

# Bootstrap seguro para ambiente open source.
# Copia arquivos .env*.example para .env.local sem credenciais reais.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FORCE_COPY="false"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/open-source/setup-env.sh [--force]

Options:
  --force   Sobrescreve arquivos .env.local existentes.
  -h, --help  Exibe ajuda.

Este script nao cria credenciais reais.
Apenas prepara arquivos locais para voce preencher com suas proprias chaves.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      FORCE_COPY="true"
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

copy_example() {
  local source_file="$1"
  local target_file="$2"

  if [ ! -f "$source_file" ]; then
    echo "[SKIP] Example file not found: $source_file"
    return 0
  fi

  if [ -f "$target_file" ] && [ "$FORCE_COPY" != "true" ]; then
    echo "[SKIP] Existing file preserved: $target_file"
    return 0
  fi

  cp "$source_file" "$target_file"
  echo "[OK] Created: $target_file"
}

echo "Preparing local env files from safe templates..."

copy_example "$ROOT_DIR/restaurante-app/.env.example" "$ROOT_DIR/restaurante-app/.env.local"
copy_example "$ROOT_DIR/restaurante-web/.env.example" "$ROOT_DIR/restaurante-web/.env.local"
copy_example "$ROOT_DIR/restaurante-ops/.env.example" "$ROOT_DIR/restaurante-ops/.env.local"
copy_example "$ROOT_DIR/restaurante-site/.env.example" "$ROOT_DIR/restaurante-site/.env.local"
copy_example "$ROOT_DIR/database-backup/.env.example" "$ROOT_DIR/database-backup/.env.local"
copy_example "$ROOT_DIR/balanca-bridge/.env.example" "$ROOT_DIR/balanca-bridge/.env.local"

echo ""
echo "Next steps:"
echo "1) Edit each .env.local and fill with your own credentials."
echo "2) Never commit .env.local files."
echo "3) Configure Railway variables before running deploy scripts."
echo ""
echo "Required Railway variables:"
echo "  RAILWAY_WORKSPACE"
echo "  RAILWAY_PROJECT"
echo "  RAILWAY_ENVIRONMENT"
