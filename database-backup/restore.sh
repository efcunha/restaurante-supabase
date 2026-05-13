#!/bin/bash

# ============================================================================
# Script de Restore - Supabase Database
# ============================================================================
# Uso: ./restore.sh [arquivo_backup.dump] [--schema-only|--data-only]
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Carregar configurações
# ============================================================================

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  echo -e "${GREEN}✓ Configurações carregadas de .env.local${NC}"
else
  echo -e "${RED}✗ Arquivo .env.local não encontrado!${NC}"
  echo -e "${YELLOW}Execute: cp .env.example .env.local${NC}"
  exit 1
fi

# ============================================================================
# Validar variáveis obrigatórias
# ============================================================================

if [ -z "$TARGET_DB_PASSWORD" ] || [ "$TARGET_DB_PASSWORD" = "CHANGE_ME_TARGET_DB_PASSWORD" ]; then
  echo -e "${RED}✗ Senha do banco de destino não configurada em .env.local${NC}"
  exit 1
fi

# ============================================================================
# Configurações
# ============================================================================

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
LOG_FILE="${LOG_DIR}/restore_$(date +"%Y-%m-%d").log"

# Determinar arquivo de backup
if [ -n "$1" ] && [ -f "$1" ]; then
  BACKUP_FILE="$1"
elif [ -f "${BACKUP_DIR}/backup_latest.dump" ]; then
  BACKUP_FILE="${BACKUP_DIR}/backup_latest.dump"
else
  echo -e "${RED}✗ Nenhum arquivo de backup especificado ou encontrado${NC}"
  echo "Uso: ./restore.sh [arquivo_backup.dump]"
  echo "Ou crie um backup primeiro com: ./backup.sh"
  exit 1
fi

# Criar diretórios se não existirem
mkdir -p "$LOG_DIR"

# ============================================================================
# Funções auxiliares
# ============================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
  exit 1
}

success() {
  echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# ============================================================================
# Início do restore
# ============================================================================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Restore do Banco de Dados Supabase${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

log "Iniciando restore..."
log "Host: $TARGET_DB_HOST"
log "Database: $TARGET_DB_NAME"
log "Schema: $BACKUP_SCHEMA"
log "Arquivo: $BACKUP_FILE"

# ============================================================================
# Verificar arquivo de backup
# ============================================================================

echo -e "${YELLOW}Verificando arquivo de backup...${NC}"

if [ ! -f "$BACKUP_FILE" ]; then
  error "Arquivo de backup não encontrado: $BACKUP_FILE"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "Arquivo: ${GREEN}$BACKUP_FILE${NC}"
echo -e "Tamanho: ${GREEN}$BACKUP_SIZE${NC}"

# Verificar integridade
if ! pg_restore -l "$BACKUP_FILE" > /dev/null 2>&1; then
  error "Arquivo de backup corrompido ou inválido"
fi

success "Arquivo de backup válido"

# ============================================================================
# Confirmação de segurança
# ============================================================================

echo ""
echo -e "${RED}⚠️  ATENÇÃO: Esta operação irá DESTRUIR TODOS OS DADOS no banco de destino!${NC}"
echo -e "${RED}O schema '$BACKUP_SCHEMA' será completamente removido (DROP CASCADE)${NC}"
echo -e "${YELLOW}Banco de destino: $TARGET_DB_HOST${NC}"
echo -e "${YELLOW}Database: $TARGET_DB_NAME${NC}"
echo -e "${YELLOW}Schema: $BACKUP_SCHEMA${NC}"
echo ""
echo -e "${RED}TODAS as tabelas, funções, triggers e dados serão PERMANENTEMENTE DELETADOS!${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
  echo -e "${YELLOW}Operação cancelada pelo usuário${NC}"
  exit 0
fi

# ============================================================================
# Testar conexão
# ============================================================================

echo ""
echo -e "${YELLOW}Testando conexão com o banco de destino...${NC}"
export PGPASSWORD="$TARGET_DB_PASSWORD"

if ! psql -h "$TARGET_DB_HOST" -p "$TARGET_DB_PORT" -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  error "Falha ao conectar no banco de dados de destino"
fi

success "Conexão estabelecida com sucesso"

# ============================================================================
# Limpar schema existente (DROP CASCADE)
# ============================================================================

echo ""
echo -e "${RED}⚠️  Removendo schema existente...${NC}"
echo -e "${YELLOW}Executando: DROP SCHEMA $BACKUP_SCHEMA CASCADE${NC}"

if psql -h "$TARGET_DB_HOST" -p "$TARGET_DB_PORT" -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" \
  -c "DROP SCHEMA IF EXISTS $BACKUP_SCHEMA CASCADE;" 2>&1 | tee -a "$LOG_FILE"; then
  success "Schema $BACKUP_SCHEMA removido com sucesso"
else
  error "Falha ao remover schema $BACKUP_SCHEMA"
fi

# Recriar schema vazio
echo -e "${YELLOW}Recriando schema $BACKUP_SCHEMA...${NC}"

if psql -h "$TARGET_DB_HOST" -p "$TARGET_DB_PORT" -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" \
  -c "CREATE SCHEMA $BACKUP_SCHEMA;" 2>&1 | tee -a "$LOG_FILE"; then
  success "Schema $BACKUP_SCHEMA recriado"
else
  error "Falha ao recriar schema $BACKUP_SCHEMA"
fi

# ============================================================================
# Executar restore
# ============================================================================

echo ""
echo -e "${YELLOW}Executando restore...${NC}"
echo -e "${YELLOW}Isso pode levar alguns minutos dependendo do tamanho do backup...${NC}"

# Construir comando pg_restore
PG_RESTORE_CMD="pg_restore \
  -h $TARGET_DB_HOST \
  -p $TARGET_DB_PORT \
  -U $TARGET_DB_USER \
  -d $TARGET_DB_NAME \
  --no-owner \
  --no-privileges \
  -n $BACKUP_SCHEMA"

# Adicionar opções baseadas em argumentos
if [[ "$*" == *"--schema-only"* ]]; then
  PG_RESTORE_CMD="$PG_RESTORE_CMD --schema-only"
  log "Modo: Schema Only"
elif [[ "$*" == *"--data-only"* ]]; then
  PG_RESTORE_CMD="$PG_RESTORE_CMD --data-only"
  log "Modo: Data Only"
else
  log "Modo: Full Restore (Schema + Data)"
fi

# Adicionar clean se configurado
if [ "$CLEAN_BEFORE_CREATE" = "true" ]; then
  PG_RESTORE_CMD="$PG_RESTORE_CMD --clean"
  warning "Modo CLEAN ativado: objetos existentes serão removidos antes do restore"
fi

# Adicionar verbose se configurado
if [ "$VERBOSE" = "true" ]; then
  PG_RESTORE_CMD="$PG_RESTORE_CMD --verbose"
fi

# Adicionar arquivo de backup
PG_RESTORE_CMD="$PG_RESTORE_CMD $BACKUP_FILE"

# Executar restore (permitir alguns erros não críticos)
if eval "$PG_RESTORE_CMD" 2>&1 | tee -a "$LOG_FILE"; then
  success "Restore concluído!"
else
  # pg_restore pode retornar erro mesmo com restore parcialmente bem-sucedido
  warning "Restore concluído com alguns avisos. Verifique o log para detalhes."
fi

# ============================================================================
# Verificação pós-restore
# ============================================================================

echo ""
echo -e "${YELLOW}Verificando restore...${NC}"

# Contar tabelas
TABLE_COUNT=$(psql -h "$TARGET_DB_HOST" -p "$TARGET_DB_PORT" -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$BACKUP_SCHEMA'" 2>/dev/null | tr -d ' ')

if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
  success "Restore verificado: $TABLE_COUNT tabelas encontradas no schema $BACKUP_SCHEMA"
else
  warning "Não foi possível verificar o número de tabelas"
fi

# ============================================================================
# Atualizar estatísticas
# ============================================================================

echo ""
echo -e "${YELLOW}Atualizando estatísticas do banco...${NC}"

if psql -h "$TARGET_DB_HOST" -p "$TARGET_DB_PORT" -U "$TARGET_DB_USER" -d "$TARGET_DB_NAME" -c "ANALYZE;" > /dev/null 2>&1; then
  success "Estatísticas atualizadas"
else
  warning "Não foi possível atualizar estatísticas"
fi

# ============================================================================
# Finalização
# ============================================================================

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Restore Concluído!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Informações:"
echo -e "  Arquivo: ${BLUE}$BACKUP_FILE${NC}"
echo -e "  Tamanho: ${BLUE}$BACKUP_SIZE${NC}"
echo -e "  Destino: ${BLUE}$TARGET_DB_HOST${NC}"
echo -e "  Database: ${BLUE}$TARGET_DB_NAME${NC}"
echo ""
echo "Verifique o log para detalhes:"
echo -e "${BLUE}$LOG_FILE${NC}"
echo ""

log "Restore finalizado"

# Limpar variável de senha
unset PGPASSWORD
