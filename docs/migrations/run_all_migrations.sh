#!/bin/bash

# ============================================================================
# Script: run_all_migrations.sh
# Description: Executa todas as migrations em ordem
# Usage: ./run_all_migrations.sh [DATABASE_URL]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database URL (pode ser passado como argumento ou variável de ambiente)
DATABASE_URL="${1:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL não definida${NC}"
  echo "Usage: ./run_all_migrations.sh postgresql://user:pass@host:port/database"
  echo "   or: DATABASE_URL=postgresql://... ./run_all_migrations.sh"
  exit 1
fi

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Iniciando Migrations - Delivery, Fiscal e Balança${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Função para executar um arquivo SQL
run_migration() {
  local file=$1
  local description=$2
  
  echo -e "${YELLOW}Executando: $file${NC}"
  echo "  → $description"
  
  if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Sucesso${NC}"
  else
    echo -e "${RED}  ✗ Erro ao executar $file${NC}"
    exit 1
  fi
  echo ""
}

# Validar pré-requisitos
echo -e "${YELLOW}[0/7] Validando pré-requisitos...${NC}"
run_migration "00_validate_prerequisites.sql" "Verificar tabelas e funções base"

# Migration 1: Delivery fields
echo -e "${YELLOW}[1/7] Adicionando campos de delivery...${NC}"
run_migration "01_add_delivery_fields.sql" "Adicionar order_source, delivery_info, etc"

# Migration 2: Entregadores table
echo -e "${YELLOW}[2/7] Criando tabela de entregadores...${NC}"
run_migration "02_create_entregadores_table.sql" "Criar tabela entregadores com RLS"

# Migration 3: Barcode fields
echo -e "${YELLOW}[3/7] Adicionando campos de código de barras...${NC}"
run_migration "03_add_barcode_fields.sql" "Adicionar barcode, pdv_code, sold_by_weight"

# Migration 4: Fiscal fields
echo -e "${YELLOW}[4/7] Adicionando campos fiscais...${NC}"
run_migration "04_add_fiscal_fields.sql" "Adicionar NCM, CFOP, tax_rate e tabela notas_fiscais"

# Migration 5: Delivery functions
echo -e "${YELLOW}[5/7] Criando funções de delivery...${NC}"
run_migration "05_create_delivery_functions.sql" "Criar dispatch_order, calculate_delivery_fee, etc"

# Migration 6: Indexes
echo -e "${YELLOW}[6/7] Criando índices de performance...${NC}"
run_migration "06_create_indexes.sql" "Criar índices para otimização"

# Validar migrations
echo -e "${YELLOW}[7/7] Validando migrations...${NC}"
run_migration "99_validate_migrations.sql" "Verificar se tudo foi aplicado corretamente"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ TODAS AS MIGRATIONS FORAM APLICADAS!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Próximos passos:"
echo "  1. Instalar expo-barcode-scanner no app mobile"
echo "  2. Criar Edge Functions no Supabase"
echo "  3. Implementar telas de delivery no app"
echo ""
