#!/bin/bash

# Smoke fallback de RLS para ambiente com apenas uma company.
# Uso:
#   cd database-backup
#   export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company>"   # opcional (auto-select se ausente)
#   export RLS_SMOKE_TERMINAL_ID="caixa_01"                          # opcional
#   bash scripts/smoke-pos-device-bindings-rls-single-tenant.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$SCRIPT_DIR/smoke_pos_device_bindings_rls_single_tenant_fallback.sql"

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

export PGPASSWORD="$SOURCE_DB_PASSWORD"

RLS_SMOKE_ADMIN_USER_ID="${RLS_SMOKE_ADMIN_USER_ID:-}"
if [[ -z "$RLS_SMOKE_ADMIN_USER_ID" ]]; then
  RLS_SMOKE_ADMIN_USER_ID="$($PSQL_BIN -h "$SOURCE_DB_HOST" -p "${SOURCE_DB_PORT:-5432}" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -At -c "SELECT id::text FROM public.profiles WHERE role IN ('admin','gerente') ORDER BY created_at LIMIT 1;")"
fi

if [[ -z "$RLS_SMOKE_ADMIN_USER_ID" ]]; then
  echo -e "${RED}✗ Não foi possível encontrar profile admin/gerente para smoke fallback.${NC}"
  unset PGPASSWORD
  exit 1
fi

RLS_SMOKE_ADMIN_COMPANY_ID="$($PSQL_BIN -h "$SOURCE_DB_HOST" -p "${SOURCE_DB_PORT:-5432}" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -At -c "SELECT company_id::text FROM public.profiles WHERE id = '$RLS_SMOKE_ADMIN_USER_ID'::uuid LIMIT 1;")"

if [[ -z "$RLS_SMOKE_ADMIN_COMPANY_ID" ]]; then
  echo -e "${RED}✗ Não foi possível resolver company_id para admin_user_id=$RLS_SMOKE_ADMIN_USER_ID.${NC}"
  unset PGPASSWORD
  exit 1
fi

RLS_SMOKE_TERMINAL_ID="${RLS_SMOKE_TERMINAL_ID:-caixa_smoke_single_tenant}"

echo -e "${BLUE}===========================================================${NC}"
echo -e "${BLUE}  Smoke fallback RLS pos_device_bindings (single-tenant)  ${NC}"
echo -e "${BLUE}===========================================================${NC}"
echo "Host: $SOURCE_DB_HOST"
echo "Database: $SOURCE_DB_NAME"
echo "User: $SOURCE_DB_USER"
echo "Admin user: $RLS_SMOKE_ADMIN_USER_ID"
echo "Admin company: $RLS_SMOKE_ADMIN_COMPANY_ID"
echo "Terminal id: $RLS_SMOKE_TERMINAL_ID"
echo ""

"$PSQL_BIN" \
  -h "$SOURCE_DB_HOST" \
  -p "${SOURCE_DB_PORT:-5432}" \
  -U "$SOURCE_DB_USER" \
  -d "$SOURCE_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -v admin_user_id="$RLS_SMOKE_ADMIN_USER_ID" \
  -v admin_company_id="$RLS_SMOKE_ADMIN_COMPANY_ID" \
  -v terminal_id="$RLS_SMOKE_TERMINAL_ID" \
  -f "$SQL_FILE"

unset PGPASSWORD

echo ""
echo -e "${GREEN}✓ Smoke fallback single-tenant concluído com sucesso.${NC}"
