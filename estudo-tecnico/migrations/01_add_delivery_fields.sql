-- ============================================================================
-- Migration: 01_add_delivery_fields.sql
-- Description: Adiciona campos para suporte a delivery na tabela orders
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Adicionar coluna order_source (origem do pedido)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_source'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN order_source TEXT 
    CHECK (order_source IN ('local', 'ifood', '99food', 'whatsapp', 'web', 'telefone'))
    DEFAULT 'local';
    
    COMMENT ON COLUMN public.orders.order_source IS 'Origem do pedido: local (presencial), ifood, 99food, whatsapp, web, telefone';
  END IF;
END $$;

-- Adicionar coluna delivery_info (informações de entrega em JSON)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_info'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN delivery_info JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN public.orders.delivery_info IS 'Informações de entrega: {"address": "...", "phone": "...", "delivery_fee": 5.00, "distance_km": 2.5, "neighborhood": "...", "complement": "..."}';
  END IF;
END $$;

-- Adicionar coluna delivery_person_id (referência ao entregador)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_person_id'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN delivery_person_id UUID;
    
    COMMENT ON COLUMN public.orders.delivery_person_id IS 'ID do entregador responsável pela entrega';
  END IF;
END $$;

-- Adicionar coluna dispatched_at (timestamp de quando saiu para entrega)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'dispatched_at'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN dispatched_at TIMESTAMPTZ;
    
    COMMENT ON COLUMN public.orders.dispatched_at IS 'Timestamp de quando o pedido saiu para entrega';
  END IF;
END $$;

-- Adicionar coluna external_order_id (ID do pedido na plataforma externa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'external_order_id'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN external_order_id TEXT;
    
    COMMENT ON COLUMN public.orders.external_order_id IS 'ID do pedido na plataforma externa (iFood, 99Food, etc)';
  END IF;
END $$;

-- Criar índice para busca por origem do pedido
CREATE INDEX IF NOT EXISTS idx_orders_order_source 
ON public.orders(company_id, order_source) 
WHERE order_source != 'local';

-- Criar índice para busca por entregador
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person 
ON public.orders(delivery_person_id) 
WHERE delivery_person_id IS NOT NULL;

-- Criar índice GIN para busca no JSON de delivery_info
CREATE INDEX IF NOT EXISTS idx_orders_delivery_info_gin 
ON public.orders USING gin(delivery_info);

-- Criar índice para pedidos despachados
CREATE INDEX IF NOT EXISTS idx_orders_dispatched 
ON public.orders(company_id, dispatched_at DESC) 
WHERE dispatched_at IS NOT NULL;

COMMENT ON INDEX public.idx_orders_order_source IS 'Índice para filtrar pedidos por origem (delivery)';
COMMENT ON INDEX public.idx_orders_delivery_person IS 'Índice para buscar pedidos por entregador';
COMMENT ON INDEX public.idx_orders_delivery_info_gin IS 'Índice GIN para busca em campos JSON de delivery';
COMMENT ON INDEX public.idx_orders_dispatched IS 'Índice para pedidos despachados (em entrega)';

-- ============================================================================
-- ROLLBACK (caso necessário reverter)
-- ============================================================================
/*
DROP INDEX IF EXISTS public.idx_orders_dispatched;
DROP INDEX IF EXISTS public.idx_orders_delivery_info_gin;
DROP INDEX IF EXISTS public.idx_orders_delivery_person;
DROP INDEX IF EXISTS public.idx_orders_order_source;

ALTER TABLE public.orders DROP COLUMN IF EXISTS external_order_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS dispatched_at;
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_person_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_info;
ALTER TABLE public.orders DROP COLUMN IF EXISTS order_source;
*/
