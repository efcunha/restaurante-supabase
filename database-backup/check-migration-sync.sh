#!/bin/bash

# ============================================================================
# Script de Verificação de Sincronização de Migrations
# ============================================================================
# Uso:
#   ./check-migration-sync.sh
#
# Resultado:
#   0 = sincronizado
#   1 = drift detectado (local != remoto)
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -f "config.local.sh" ]; then
  # shellcheck disable=SC1091
  source config.local.sh
else
  echo -e "${RED}✗ Arquivo config.local.sh não encontrado!${NC}"
  echo -e "${YELLOW}Execute: cp config.example.sh config.local.sh${NC}"
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
elif [ -x "$HOME/scoop/apps/postgresql/current/bin/psql.exe" ]; then
  PSQL_BIN="$HOME/scoop/apps/postgresql/current/bin/psql.exe"
else
  echo -e "${RED}✗ psql não encontrado no PATH.${NC}"
  echo -e "${YELLOW}Instale PostgreSQL client tools para executar este check.${NC}"
  exit 1
fi

if [ -z "${SOURCE_DB_PASSWORD:-}" ] || [ "${SOURCE_DB_PASSWORD}" = "Sua senha aqui" ]; then
  echo -e "${RED}✗ SOURCE_DB_PASSWORD não configurada em config.local.sh${NC}"
  exit 1
fi

if [ -z "${SOURCE_DB_HOST:-}" ] || [ -z "${SOURCE_DB_USER:-}" ] || [ -z "${SOURCE_DB_NAME:-}" ]; then
  echo -e "${RED}✗ Variáveis SOURCE_DB_* incompletas em config.local.sh${NC}"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
LOCAL_FILE="$TMP_DIR/local_versions.txt"
REMOTE_FILE="$TMP_DIR/remote_versions.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

# Coleta versões locais: apenas migrations versionadas por timestamp (14 dígitos)
find "./migrations" -maxdepth 1 -type f -name '*.sql' \
  | sed -E 's#^.*/##' \
  | sed -nE 's/^([0-9]{14})_.+\.sql$/\1/p' \
  | sort -u > "$LOCAL_FILE"

if [ ! -s "$LOCAL_FILE" ]; then
  echo -e "${RED}✗ Nenhuma migration versionada encontrada em ./migrations${NC}"
  exit 1
fi

export PGPASSWORD="$SOURCE_DB_PASSWORD"

if ! "$PSQL_BIN" \
  -h "$SOURCE_DB_HOST" \
  -p "${SOURCE_DB_PORT:-5432}" \
  -U "$SOURCE_DB_USER" \
  -d "$SOURCE_DB_NAME" \
  -At \
  -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version" \
  > "$REMOTE_FILE" 2>/dev/null; then
  unset PGPASSWORD
  echo -e "${RED}✗ Falha ao consultar supabase_migrations.schema_migrations no banco remoto${NC}"
  exit 1
fi

unset PGPASSWORD

tr -d '\r' < "$REMOTE_FILE" > "$REMOTE_FILE.cleaned"
mv "$REMOTE_FILE.cleaned" "$REMOTE_FILE"

sort -u -o "$REMOTE_FILE" "$REMOTE_FILE"

ONLY_LOCAL="$TMP_DIR/only_local.txt"
ONLY_REMOTE="$TMP_DIR/only_remote.txt"

comm -23 "$LOCAL_FILE" "$REMOTE_FILE" > "$ONLY_LOCAL"
comm -13 "$LOCAL_FILE" "$REMOTE_FILE" > "$ONLY_REMOTE"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verificação de Sincronização de Migrations${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Local:  $(wc -l < "$LOCAL_FILE") versões"
echo -e "Remoto: $(wc -l < "$REMOTE_FILE") versões"

drift=0

if [ -s "$ONLY_LOCAL" ]; then
  drift=1
  echo ""
  echo -e "${YELLOW}⚠ Versões locais NÃO registradas no banco remoto:${NC}"
  cat "$ONLY_LOCAL" | sed 's/^/  - /'
fi

if [ -s "$ONLY_REMOTE" ]; then
  drift=1
  echo ""
  echo -e "${YELLOW}⚠ Versões remotas que NÃO existem em ./migrations:${NC}"
  cat "$ONLY_REMOTE" | sed 's/^/  - /'
fi

if [ "$drift" -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Sem drift: migrations locais e remotas estão sincronizadas.${NC}"
  exit 0
fi

echo ""
echo -e "${RED}✗ Drift detectado.${NC}"
echo -e "${YELLOW}Ação recomendada:${NC}"
echo "  1) Se rodou SQL manual, crie migration de reconciliação e registre a versão."
echo "  2) Se criou migration local, aplique no banco e valide no histórico remoto."
exit 1
