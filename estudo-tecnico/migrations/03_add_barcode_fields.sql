-- ============================================================================
-- Migration: 03_add_barcode_fields.sql
-- Description: Adiciona campos para código de barras e venda por peso
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Adicionar coluna barcode (código de barras)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN barcode TEXT;
    
    COMMENT ON COLUMN public.products.barcode IS 'Código de barras do produto (EAN-13, EAN-8, etc)';
  END IF;
END $$;

-- Adicionar coluna pdv_code (código PDV para integração)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'pdv_code'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN pdv_code TEXT;
    
    COMMENT ON COLUMN public.products.pdv_code IS 'Código do produto no sistema PDV/Balança';
  END IF;
END $$;

-- Adicionar coluna sold_by_weight (vendido por peso)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sold_by_weight'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN sold_by_weight BOOLEAN DEFAULT false NOT NULL;
    
    COMMENT ON COLUMN public.products.sold_by_weight IS 'Indica se o produto é vendido por peso (kg)';
  END IF;
END $$;

-- Adicionar coluna weight_unit (unidade de peso)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN weight_unit TEXT 
    CHECK (weight_unit IN ('kg', 'g', '100g'))
    DEFAULT 'kg';
    
    COMMENT ON COLUMN public.products.weight_unit IS 'Unidade de medida para produtos vendidos por peso: kg, g, 100g';
  END IF;
END $$;

-- Adicionar coluna price_per_unit (preço por unidade de peso)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'price_per_unit'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN price_per_unit NUMERIC(10,2);
    
    COMMENT ON COLUMN public.products.price_per_unit IS 'Preço por unidade de peso (ex: R$ 45,90/kg)';
  END IF;
END $$;

-- Adicionar coluna barcode_format (formato do código de barras)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode_format'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN barcode_format TEXT 
    CHECK (barcode_format IN ('EAN13', 'EAN8', 'CODE128', 'UPCA', 'CUSTOM'))
    DEFAULT 'EAN13';
    
    COMMENT ON COLUMN public.products.barcode_format IS 'Formato do código de barras: EAN13, EAN8, CODE128, UPCA, CUSTOM';
  END IF;
END $$;

-- Criar índice único para barcode (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique 
ON public.products(company_id, barcode) 
WHERE barcode IS NOT NULL AND barcode != '';

-- Criar índice para busca por código PDV
CREATE INDEX IF NOT EXISTS idx_products_pdv_code 
ON public.products(company_id, pdv_code) 
WHERE pdv_code IS NOT NULL;

-- Criar índice para produtos vendidos por peso
CREATE INDEX IF NOT EXISTS idx_products_sold_by_weight 
ON public.products(company_id, sold_by_weight) 
WHERE sold_by_weight = true;

COMMENT ON INDEX public.idx_products_barcode_unique IS 'Índice único para código de barras por empresa';
COMMENT ON INDEX public.idx_products_pdv_code IS 'Índice para busca por código PDV';
COMMENT ON INDEX public.idx_products_sold_by_weight IS 'Índice parcial para produtos vendidos por peso';

-- Função auxiliar para validar código de barras EAN-13
CREATE OR REPLACE FUNCTION public.validate_ean13(barcode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  check_digit INTEGER;
  calculated_digit INTEGER;
  sum_odd INTEGER := 0;
  sum_even INTEGER := 0;
  i INTEGER;
BEGIN
  -- Verificar se tem 13 dígitos
  IF length(barcode) != 13 OR barcode !~ '^\d+$' THEN
    RETURN false;
  END IF;
  
  -- Calcular dígito verificador
  FOR i IN 1..12 LOOP
    IF i % 2 = 1 THEN
      sum_odd := sum_odd + substring(barcode, i, 1)::INTEGER;
    ELSE
      sum_even := sum_even + substring(barcode, i, 1)::INTEGER;
    END IF;
  END LOOP;
  
  calculated_digit := (10 - ((sum_odd + sum_even * 3) % 10)) % 10;
  check_digit := substring(barcode, 13, 1)::INTEGER;
  
  RETURN calculated_digit = check_digit;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.validate_ean13(TEXT) IS 'Valida código de barras EAN-13 verificando o dígito verificador';

-- Função para decodificar código de barras de balança (formato 2AAAAAVVVVVVJ)
CREATE OR REPLACE FUNCTION public.decode_weight_barcode(barcode TEXT)
RETURNS TABLE(
  product_code TEXT,
  value_or_weight NUMERIC,
  is_price BOOLEAN,
  check_digit TEXT
) AS $$
BEGIN
  -- Verificar se é código de balança (começa com 2 e tem 13 dígitos)
  IF length(barcode) != 13 OR substring(barcode, 1, 1) != '2' THEN
    RAISE EXCEPTION 'Código de barras inválido para balança';
  END IF;
  
  RETURN QUERY
  SELECT 
    substring(barcode, 2, 5) as product_code,
    (substring(barcode, 7, 6)::NUMERIC / 100) as value_or_weight,
    true as is_price, -- Assumir que é preço (pode ser configurável)
    substring(barcode, 13, 1) as check_digit;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.decode_weight_barcode(TEXT) IS 'Decodifica código de barras de balança no formato 2AAAAAVVVVVVJ';

-- ============================================================================
-- ROLLBACK (caso necessário reverter)
-- ============================================================================
/*
DROP FUNCTION IF EXISTS public.decode_weight_barcode(TEXT);
DROP FUNCTION IF EXISTS public.validate_ean13(TEXT);

DROP INDEX IF EXISTS public.idx_products_sold_by_weight;
DROP INDEX IF EXISTS public.idx_products_pdv_code;
DROP INDEX IF EXISTS public.idx_products_barcode_unique;

ALTER TABLE public.products DROP COLUMN IF EXISTS barcode_format;
ALTER TABLE public.products DROP COLUMN IF EXISTS price_per_unit;
ALTER TABLE public.products DROP COLUMN IF EXISTS weight_unit;
ALTER TABLE public.products DROP COLUMN IF EXISTS sold_by_weight;
ALTER TABLE public.products DROP COLUMN IF EXISTS pdv_code;
ALTER TABLE public.products DROP COLUMN IF EXISTS barcode;
*/
