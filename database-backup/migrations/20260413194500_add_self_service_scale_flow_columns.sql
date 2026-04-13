-- Migration: add_self_service_scale_flow_columns
-- Date: 2026-04-13
-- Goal: additively support self-service scale flow without changing legacy behavior
-- Safety: only additive columns/checks/indexes; no drop/rename on existing fields

BEGIN;

-- ------------------------------------------------------------
-- ORDERS: classify origin and operational routing of each order
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_origin text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS operational_route text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS service_point text,
  ADD COLUMN IF NOT EXISTS auto_generated_comanda boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_origin_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_origin_check
      CHECK (order_origin = ANY (ARRAY['standard'::text, 'self_service_scale'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_operational_route_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_operational_route_check
      CHECK (operational_route = ANY (ARRAY['production'::text, 'bypass_production'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_company_date_origin_route
  ON public.orders (company_id, date_key, order_origin, operational_route);

COMMENT ON COLUMN public.orders.order_origin IS
  'Order semantic source. standard = legacy/default; self_service_scale = weighed self-service flow.';
COMMENT ON COLUMN public.orders.operational_route IS
  'Operational routing. production = legacy kitchen/montagem path; bypass_production = do not enter production queues.';
COMMENT ON COLUMN public.orders.service_point IS
  'Optional origin point identifier (e.g., balanca_01, balanca_salao).';
COMMENT ON COLUMN public.orders.auto_generated_comanda IS
  'True when the comanda was automatically created by self-service scale flow.';

-- ------------------------------------------------------------
-- COMANDAS: classify origin and expected payment mode
-- ------------------------------------------------------------
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS comanda_origin text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'deferred',
  ADD COLUMN IF NOT EXISTS closed_at_scale boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comandas_origin_check'
      AND conrelid = 'public.comandas'::regclass
  ) THEN
    ALTER TABLE public.comandas
      ADD CONSTRAINT comandas_origin_check
      CHECK (comanda_origin = ANY (ARRAY['standard'::text, 'self_service_scale'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comandas_payment_mode_check'
      AND conrelid = 'public.comandas'::regclass
  ) THEN
    ALTER TABLE public.comandas
      ADD CONSTRAINT comandas_payment_mode_check
      CHECK (payment_mode = ANY (ARRAY['immediate'::text, 'deferred'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comandas_company_date_origin_mode
  ON public.comandas (company_id, date_key, comanda_origin, payment_mode);

COMMENT ON COLUMN public.comandas.comanda_origin IS
  'Comanda semantic source. standard = legacy/default; self_service_scale = originated at weighed self-service station.';
COMMENT ON COLUMN public.comandas.payment_mode IS
  'Expected payment flow. immediate = payment at scale station; deferred = pay later at cashier.';
COMMENT ON COLUMN public.comandas.closed_at_scale IS
  'True when comanda was fully paid and closed at the scale station.';

-- ------------------------------------------------------------
-- PAGAMENTOS: optional channel/idempotency metadata for traceability
-- ------------------------------------------------------------
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS payment_channel text,
  ADD COLUMN IF NOT EXISTS payment_correlation_id text;

CREATE INDEX IF NOT EXISTS idx_pagamentos_company_date_channel
  ON public.pagamentos (company_id, date_key, payment_channel);

-- Idempotency key for payment attempts (null allowed for legacy inserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamentos_company_correlation_id_unique
  ON public.pagamentos (company_id, payment_correlation_id)
  WHERE payment_correlation_id IS NOT NULL;

COMMENT ON COLUMN public.pagamentos.payment_channel IS
  'Payment channel used in operation: tef_integrado, external_pos, caixa, etc.';
COMMENT ON COLUMN public.pagamentos.payment_correlation_id IS
  'Idempotency/correlation key for payment attempts. Unique per company when provided.';

COMMIT;
