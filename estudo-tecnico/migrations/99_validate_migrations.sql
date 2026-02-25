-- ============================================================================
-- Migration: 99_validate_migrations.sql
-- Description: Valida se todas as migrations foram aplicadas corretamente
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Verificar colunas adicionadas em orders
DO $$
DECLARE
  v_missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar order_source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_source'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'orders.order_source');
  END IF;
  
  -- Verificar delivery_info
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_info'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'orders.delivery_info');
  END IF;
  
  -- Verificar delivery_person_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_person_id'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'orders.delivery_person_id');
  END IF;
  
  -- Verificar dispatched_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'dispatched_at'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'orders.dispatched_at');
  END IF;
  
  -- Verificar external_order_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'external_order_id'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'orders.external_order_id');
  END IF;
  
  IF array_length(v_missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Colunas faltando em orders: %', array_to_string(v_missing_columns, ', ');
  ELSE
    RAISE NOTICE '✓ Todas as colunas de delivery em orders foram criadas';
  END IF;
END $$;

-- Verificar colunas adicionadas em products
DO $$
DECLARE
  v_missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar barcode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.barcode');
  END IF;
  
  -- Verificar pdv_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'pdv_code'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.pdv_code');
  END IF;
  
  -- Verificar sold_by_weight
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sold_by_weight'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.sold_by_weight');
  END IF;
  
  -- Verificar ncm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'ncm'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.ncm');
  END IF;
  
  -- Verificar cfop
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cfop'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.cfop');
  END IF;
  
  -- Verificar tax_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'tax_rate'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'products.tax_rate');
  END IF;
  
  IF array_length(v_missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Colunas faltando em products: %', array_to_string(v_missing_columns, ', ');
  ELSE
    RAISE NOTICE '✓ Todas as colunas em products foram criadas';
  END IF;
END $$;

-- Verificar tabela entregadores
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'entregadores') THEN
    RAISE EXCEPTION 'Tabela entregadores não foi criada';
  ELSE
    RAISE NOTICE '✓ Tabela entregadores criada';
  END IF;
END $$;

-- Verificar tabela notas_fiscais
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'notas_fiscais') THEN
    RAISE EXCEPTION 'Tabela notas_fiscais não foi criada';
  ELSE
    RAISE NOTICE '✓ Tabela notas_fiscais criada';
  END IF;
END $$;

-- Verificar funções criadas
DO $$
DECLARE
  v_missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'validate_ean13') THEN
    v_missing_functions := array_append(v_missing_functions, 'validate_ean13');
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'decode_weight_barcode') THEN
    v_missing_functions := array_append(v_missing_functions, 'decode_weight_barcode');
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'dispatch_order') THEN
    v_missing_functions := array_append(v_missing_functions, 'dispatch_order');
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'calculate_delivery_fee') THEN
    v_missing_functions := array_append(v_missing_functions, 'calculate_delivery_fee');
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_available_delivery_persons') THEN
    v_missing_functions := array_append(v_missing_functions, 'get_available_delivery_persons');
  END IF;
  
  IF array_length(v_missing_functions, 1) > 0 THEN
    RAISE EXCEPTION 'Funções faltando: %', array_to_string(v_missing_functions, ', ');
  ELSE
    RAISE NOTICE '✓ Todas as funções foram criadas';
  END IF;
END $$;

-- Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'products', 'entregadores', 'notas_fiscais')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Resumo final
SELECT 
  'orders' as table_name,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'orders'
UNION ALL
SELECT 
  'products',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'products'
UNION ALL
SELECT 
  'entregadores',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'entregadores'
UNION ALL
SELECT 
  'notas_fiscais',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'notas_fiscais';

RAISE NOTICE '============================================';
RAISE NOTICE '✓ TODAS AS MIGRATIONS FORAM APLICADAS COM SUCESSO!';
RAISE NOTICE '============================================';
