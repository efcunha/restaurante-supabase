#!/bin/bash

# ============================================================================
# Arquivo de Configuração - Database Backup & Restore
# ============================================================================
# IMPORTANTE: 
# 1. Copie este arquivo para config.local.sh
# 2. Edite config.local.sh com suas credenciais reais
# 3. NUNCA commite config.local.sh no Git
# ============================================================================

# ============================================================================
# BANCO DE ORIGEM (SOURCE) - De onde fazer backup
# ============================================================================
export SOURCE_DB_HOST="aws-0-us-west-2.pooler.supabase.com"
export SOURCE_DB_PORT="5432"
export SOURCE_DB_USER="postgres.ykalocfhnetxenvmtlcn"
export SOURCE_DB_NAME="postgres"
export SOURCE_DB_PASSWORD="A13546289b@P@ssw0rd"

# ============================================================================
# BANCO DE DESTINO (TARGET) - Para onde fazer restore
# ============================================================================
export TARGET_DB_HOST="aws-1-us-east-2.pooler.supabase.com"
export TARGET_DB_PORT="5432"
export TARGET_DB_USER="postgres.bqeemgkbzshupjrjxmuv"
export TARGET_DB_NAME="postgres"
export TARGET_DB_PASSWORD="Sua senha aqui"

# ============================================================================
# CONFIGURAÇÕES DE BACKUP
# ============================================================================

# Schema a ser incluído no backup (padrão: public)
export BACKUP_SCHEMA="public"

# Formato do backup (-Fc = custom, -Fp = plain SQL, -Ft = tar)
export BACKUP_FORMAT="c"  # c = custom (recomendado)

# Nível de compressão (0-9, onde 9 é máxima compressão)
export COMPRESSION_LEVEL="6"

# Diretório para salvar backups
export BACKUP_DIR="./backups"

# Diretório para logs
export LOG_DIR="./logs"

# Número de backups a manter (0 = manter todos)
export KEEP_BACKUPS="7"

# ============================================================================
# CONFIGURAÇÕES DE CONEXÃO
# ============================================================================

# SSL Mode (require, prefer, allow, disable)
export PGSSLMODE="require"

# Timeout de conexão (segundos)
export CONNECT_TIMEOUT="30"

# ============================================================================
# OPÇÕES AVANÇADAS
# ============================================================================

# Incluir comandos DROP antes de CREATE
export CLEAN_BEFORE_CREATE="false"

# Incluir comandos CREATE DATABASE
export CREATE_DATABASE="false"

# Incluir dados BLOB/LARGE OBJECTS
export INCLUDE_BLOBS="true"

# Verbose output
export VERBOSE="true"

# ============================================================================
# NOTIFICAÇÕES (Opcional)
# ============================================================================

# Email para notificações (deixe vazio para desabilitar)
export NOTIFICATION_EMAIL=""

# Webhook para notificações (deixe vazio para desabilitar)
export NOTIFICATION_WEBHOOK=""

# ============================================================================
# EXEMPLO DE USO
# ============================================================================
# 
# 1. Copiar este arquivo:
#    cp config.example.sh config.local.sh
#
# 2. Editar config.local.sh:
#    nano config.local.sh
#
# 3. Substituir "SUA_SENHA_AQUI" pelas senhas reais
#
# 4. Executar backup:
#    ./backup.sh
#
# 5. Executar restore:
#    ./restore.sh
#
# ============================================================================
