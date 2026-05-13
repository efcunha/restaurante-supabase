#!/bin/bash

# Executa verificacao pos-apply da migration de pos_device_bindings
# Uso:
#   cd database-backup
#   bash scripts/verify-pos-device-bindings.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$SCRIPT_DIR/verify_pos_device_bindings.sql"

if [ ! -f "$ROOT_DIR/.env.local" ]; then
  echo -e "${RED}✗ database-backup/.env.local não encontrado${NC}"
  echo -e "${YELLOW}Use database-backup/.env.example como base e configure as variáveis SOURCE_DB_*${NC}"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env.local"
set +a

if [ -x "$HOME/scoop/apps/postgresql/current/bin/psql.exe" ]; then
  PSQL_BIN="$HOME/scoop/apps/postgresql/current/bin/psql.exe"
elif command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
else
  echo -e "${RED}✗ psql não encontrado no PATH${NC}"
  exit 1
fi

if [ -z "${SOURCE_DB_PASSWORD:-}" ] || [ -z "${SOURCE_DB_HOST:-}" ] || [ -z "${SOURCE_DB_USER:-}" ] || [ -z "${SOURCE_DB_NAME:-}" ]; then
  echo -e "${RED}✗ Variáveis SOURCE_DB_* incompletas em database-backup/.env.local${NC}"
  exit 1
fi

export PGPASSWORD="$SOURCE_DB_PASSWORD"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verificacao pos_device_bindings (remoto)  ${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Host: $SOURCE_DB_HOST"
echo "Database: $SOURCE_DB_NAME"
echo "User: $SOURCE_DB_USER"
echo "SQL: $SQL_FILE"
echo ""

"$PSQL_BIN" \
  -h "$SOURCE_DB_HOST" \
  -p "${SOURCE_DB_PORT:-5432}" \
  -U "$SOURCE_DB_USER" \
  -d "$SOURCE_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL_FILE"

unset PGPASSWORD

echo ""
echo -e "${GREEN}✓ Verificação concluída.${NC}"
