-- ============================================================================
-- Migration: 00_validate_prerequisites.sql
-- Description: Valida pré-requisitos antes de executar as migrations
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Verificar se as tabelas base existem
DO $$
BEGIN
  -- Verificar tabela orders
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'orders') THEN
    RAISE EXCEPTION 'Tabela orders não existe. Execute o schema base primeiro.';
  END IF;
  
  -- Verificar tabela products
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'products') THEN
    RAISE EXCEPTION 'Tabela products não existe. Execute o schema base primeiro.';
  END IF;
  
  -- Verificar tabela companies
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') THEN
    RAISE EXCEPTION 'Tabela companies não existe. Execute o schema base primeiro.';
  END IF;
  
  -- Verificar tabela profiles
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
    RAISE EXCEPTION 'Tabela profiles não existe. Execute o schema base primeiro.';
  END IF;
  
  RAISE NOTICE '✓ Todas as tabelas base existem';
END $$;

-- Verificar se as funções RLS existem
DO $$
BEGIN
  -- Verificar get_my_company_id
  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_my_company_id'
  ) THEN
    RAISE EXCEPTION 'Função get_my_company_id não existe. Execute o schema base primeiro.';
  END IF;
  
  -- Verificar is_admin_or_manager
  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'is_admin_or_manager'
  ) THEN
    RAISE EXCEPTION 'Função is_admin_or_manager não existe. Execute o schema base primeiro.';
  END IF;
  
  RAISE NOTICE '✓ Todas as funções RLS existem';
END $$;

-- Verificar versão do PostgreSQL
DO $$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT current_setting('server_version_num')::INTEGER INTO v_version;
  
  IF v_version < 140000 THEN
    RAISE WARNING 'PostgreSQL versão % detectada. Recomendado versão 14+', 
      current_setting('server_version');
  ELSE
    RAISE NOTICE '✓ PostgreSQL versão % OK', current_setting('server_version');
  END IF;
END $$;

-- Verificar extensões necessárias
DO $$
BEGIN
  -- Verificar uuid-ossp ou pgcrypto
  IF NOT EXISTS (
    SELECT FROM pg_extension 
    WHERE extname IN ('uuid-ossp', 'pgcrypto')
  ) THEN
    RAISE EXCEPTION 'Extensão UUID não encontrada. Execute: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";';
  END IF;
  
  RAISE NOTICE '✓ Extensões necessárias instaladas';
END $$;

-- Listar colunas atuais das tabelas principais
SELECT 
  'orders' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

SELECT 
  'products' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Verificar espaço disponível
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  pg_size_pretty(pg_total_relation_size('orders')) as orders_size,
  pg_size_pretty(pg_total_relation_size('products')) as products_size;

RAISE NOTICE '============================================';
RAISE NOTICE 'Validação concluída com sucesso!';
RAISE NOTICE 'Você pode prosseguir com as migrations.';
RAISE NOTICE '============================================';
