#!/bin/bash

# ============================================================================
# Script de Backup - Supabase Database
# ============================================================================
# Uso: ./backup.sh [nome_do_backup] [--schema-only|--data-only]
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

if [ -f "config.local.sh" ]; then
  source config.local.sh
  echo -e "${GREEN}✓ Configurações carregadas de config.local.sh${NC}"
else
  echo -e "${RED}✗ Arquivo config.local.sh não encontrado!${NC}"
  echo -e "${YELLOW}Execute: cp config.example.sh config.local.sh${NC}"
  exit 1
fi

# ============================================================================
# Validar variáveis obrigatórias
# ============================================================================

if [ -z "$SOURCE_DB_PASSWORD" ] || [ "$SOURCE_DB_PASSWORD" = "SUA_SENHA_AQUI" ]; then
  echo -e "${RED}✗ Senha não configurada em config.local.sh${NC}"
  exit 1
fi

# ============================================================================
# Configurações
# ============================================================================

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.dump"
LOG_FILE="${LOG_DIR}/backup_$(date +"%Y-%m-%d").log"

# Criar diretórios se não existirem
mkdir -p "$BACKUP_DIR"
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
# Início do backup
# ============================================================================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Backup do Banco de Dados Supabase${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

log "Iniciando backup..."
log "Host: $SOURCE_DB_HOST"
log "Database: $SOURCE_DB_NAME"
log "Schema: $BACKUP_SCHEMA"
log "Arquivo: $BACKUP_FILE"

# ============================================================================
# Testar conexão
# ============================================================================

echo -e "${YELLOW}Testando conexão com o banco...${NC}"
export PGPASSWORD="$SOURCE_DB_PASSWORD"

if ! psql -h "$SOURCE_DB_HOST" -p "$SOURCE_DB_PORT" -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  error "Falha ao conectar no banco de dados"
fi

success "Conexão estabelecida com sucesso"

# ============================================================================
# Executar backup
# ============================================================================

echo ""
echo -e "${YELLOW}Executando backup...${NC}"

# Construir comando pg_dump
PG_DUMP_CMD="pg_dump \
  -h $SOURCE_DB_HOST \
  -p $SOURCE_DB_PORT \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -n $BACKUP_SCHEMA \
  -F$BACKUP_FORMAT \
  -Z $COMPRESSION_LEVEL"

# Adicionar opções baseadas em argumentos
if [[ "$*" == *"--schema-only"* ]]; then
  PG_DUMP_CMD="$PG_DUMP_CMD --schema-only"
  log "Modo: Schema Only"
elif [[ "$*" == *"--data-only"* ]]; then
  PG_DUMP_CMD="$PG_DUMP_CMD --data-only"
  log "Modo: Data Only"
else
  log "Modo: Full Backup (Schema + Data)"
fi

# Adicionar verbose se configurado
if [ "$VERBOSE" = "true" ]; then
  PG_DUMP_CMD="$PG_DUMP_CMD --verbose"
fi

# Executar backup
PG_DUMP_CMD="$PG_DUMP_CMD -f $BACKUP_FILE"

if eval "$PG_DUMP_CMD" 2>&1 | tee -a "$LOG_FILE"; then
  success "Backup concluído com sucesso!"
else
  error "Falha ao executar backup"
fi

# ============================================================================
# Informações do backup
# ============================================================================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Informações do Backup${NC}"
echo -e "${BLUE}============================================${NC}"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "Arquivo: ${GREEN}$BACKUP_FILE${NC}"
echo -e "Tamanho: ${GREEN}$BACKUP_SIZE${NC}"
echo -e "Data: ${GREEN}$(date)${NC}"

log "Tamanho do backup: $BACKUP_SIZE"

# ============================================================================
# Criar link simbólico para último backup
# ============================================================================

ln -sf "$(basename "$BACKUP_FILE")" "${BACKUP_DIR}/backup_latest.dump"
log "Link simbólico criado: backup_latest.dump"

# ============================================================================
# Limpeza de backups antigos
# ============================================================================

if [ "$KEEP_BACKUPS" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}Limpando backups antigos (mantendo últimos $KEEP_BACKUPS)...${NC}"
  
  OLD_BACKUPS=$(ls -t "${BACKUP_DIR}"/*.dump 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)))
  
  if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
      rm -f "$file"
      log "Backup antigo removido: $file"
      echo -e "  ${RED}✗${NC} Removido: $(basename "$file")"
    done
  else
    echo -e "  ${GREEN}✓${NC} Nenhum backup antigo para remover"
  fi
fi

# ============================================================================
# Verificar integridade do backup
# ============================================================================

echo ""
echo -e "${YELLOW}Verificando integridade do backup...${NC}"

if pg_restore -l "$BACKUP_FILE" > /dev/null 2>&1; then
  success "Backup íntegro e válido"
else
  warning "Não foi possível verificar a integridade do backup"
fi

# ============================================================================
# Finalização
# ============================================================================

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Backup Concluído com Sucesso!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Para restaurar este backup, execute:"
echo -e "${BLUE}./restore.sh $BACKUP_FILE${NC}"
echo ""

log "Backup finalizado com sucesso"

# Limpar variável de senha
unset PGPASSWORD
