#!/bin/bash

# Smoke test de RLS para public.pos_device_bindings
# Uso:
#   cd database-backup
#   export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company_A>"
#   export RLS_SMOKE_OTHER_COMPANY_USER_ID="<uuid_profile_company_B>"
#   export RLS_SMOKE_TERMINAL_ID="caixa_01"
#   bash scripts/smoke-pos-device-bindings-rls.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$SCRIPT_DIR/smoke_pos_device_bindings_rls.sql"

if [ ! -f "$ROOT_DIR/.env.local" ]; then
  echo -e "${RED}✗ database-backup/.env.local não encontrado${NC}"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env.local"
set +a

if command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
elif [ -x "$HOME/scoop/apps/postgresql/current/bin/psql.exe" ]; then
  PSQL_BIN="$HOME/scoop/apps/postgresql/current/bin/psql.exe"
else
  echo -e "${RED}✗ psql não encontrado no PATH${NC}"
  exit 1
fi

if [ -z "${SOURCE_DB_PASSWORD:-}" ] || [ -z "${SOURCE_DB_HOST:-}" ] || [ -z "${SOURCE_DB_USER:-}" ] || [ -z "${SOURCE_DB_NAME:-}" ]; then
  echo -e "${RED}✗ Variáveis SOURCE_DB_* incompletas em database-backup/.env.local${NC}"
  exit 1
fi

if [ -z "${RLS_SMOKE_ADMIN_USER_ID:-}" ] || [ -z "${RLS_SMOKE_OTHER_COMPANY_USER_ID:-}" ]; then
  echo -e "${RED}✗ Defina RLS_SMOKE_ADMIN_USER_ID e RLS_SMOKE_OTHER_COMPANY_USER_ID antes de executar.${NC}"
  exit 1
fi

RLS_SMOKE_TERMINAL_ID="${RLS_SMOKE_TERMINAL_ID:-caixa_smoke_rls}"

export PGPASSWORD="$SOURCE_DB_PASSWORD"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Smoke RLS pos_device_bindings (remoto)    ${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Host: $SOURCE_DB_HOST"
echo "Database: $SOURCE_DB_NAME"
echo "User: $SOURCE_DB_USER"
echo "Admin user: $RLS_SMOKE_ADMIN_USER_ID"
echo "Other-company user: $RLS_SMOKE_OTHER_COMPANY_USER_ID"
echo "Terminal id: $RLS_SMOKE_TERMINAL_ID"
echo ""

"$PSQL_BIN" \
  -h "$SOURCE_DB_HOST" \
  -p "${SOURCE_DB_PORT:-5432}" \
  -U "$SOURCE_DB_USER" \
  -d "$SOURCE_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -v admin_user_id="$RLS_SMOKE_ADMIN_USER_ID" \
  -v other_company_user_id="$RLS_SMOKE_OTHER_COMPANY_USER_ID" \
  -v terminal_id="$RLS_SMOKE_TERMINAL_ID" \
  -f "$SQL_FILE"

unset PGPASSWORD

echo ""
echo -e "${GREEN}✓ Smoke test RLS concluído com sucesso.${NC}"
