#!/bin/bash

# Seleciona candidatos para smoke RLS cross-tenant em pos_device_bindings.
# Saida em formato export para uso direto no shell quando houver par válido.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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

COMPANY_COUNT="$($PSQL_BIN -h "$SOURCE_DB_HOST" -p "${SOURCE_DB_PORT:-5432}" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -At -c "SELECT count(DISTINCT company_id) FROM public.profiles;")"

if [[ "$COMPANY_COUNT" -lt 2 ]]; then
  echo -e "${YELLOW}⚠ Apenas ${COMPANY_COUNT} company encontrada em public.profiles.${NC}"
  echo -e "${YELLOW}Smoke cross-tenant não pode ser executado neste ambiente atual.${NC}"
  echo ""
  echo "Próximo passo recomendado:"
  echo "1) Criar/usar profile de outra company no ambiente de validação"
  echo "2) Reexecutar este script para obter exports prontos"
  unset PGPASSWORD
  exit 2
fi

ADMIN_ROW="$($PSQL_BIN -h "$SOURCE_DB_HOST" -p "${SOURCE_DB_PORT:-5432}" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -At -c "SELECT id::text||'|'||company_id::text FROM public.profiles WHERE role IN ('admin','gerente') ORDER BY created_at LIMIT 1;")"
ADMIN_USER_ID="${ADMIN_ROW%%|*}"
ADMIN_COMPANY_ID="${ADMIN_ROW##*|}"

OTHER_USER_ID="$($PSQL_BIN -h "$SOURCE_DB_HOST" -p "${SOURCE_DB_PORT:-5432}" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -At -c "SELECT id::text FROM public.profiles WHERE company_id <> '$ADMIN_COMPANY_ID'::uuid ORDER BY created_at LIMIT 1;")"

if [[ -z "$ADMIN_USER_ID" || -z "$OTHER_USER_ID" ]]; then
  echo -e "${RED}✗ Não foi possível selecionar candidatos para o smoke RLS.${NC}"
  unset PGPASSWORD
  exit 1
fi

echo -e "${GREEN}✓ Candidatos encontrados para smoke cross-tenant${NC}"
echo ""
echo "Use os exports abaixo no terminal:"
echo "export RLS_SMOKE_ADMIN_USER_ID=\"$ADMIN_USER_ID\""
echo "export RLS_SMOKE_OTHER_COMPANY_USER_ID=\"$OTHER_USER_ID\""
echo "export RLS_SMOKE_TERMINAL_ID=\"caixa_01\""

unset PGPASSWORD
