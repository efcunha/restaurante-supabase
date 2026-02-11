-- ============================================================================
-- Migration: 06_create_indexes.sql
-- Description: Índices adicionais para otimização de performance
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Índice composto para busca de pedidos delivery por data e status
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status 
ON public.orders(company_id, date_key, status) 
WHERE order_source != 'local';

COMMENT ON INDEX public.idx_orders_delivery_date_status IS 'Índice para filtrar pedidos delivery por data e status';

-- Índice para busca de produtos por NCM (fiscal)
CREATE INDEX IF NOT EXISTS idx_products_ncm 
ON public.products(company_id, ncm) 
WHERE ncm IS NOT NULL;

COMMENT ON INDEX public.idx_products_ncm IS 'Índice para busca de produtos por código NCM';

-- Índice para busca de produtos por CFOP (fiscal)
CREATE INDEX IF NOT EXISTS idx_products_cfop 
ON public.products(company_id, cfop) 
WHERE cfop IS NOT NULL;

COMMENT ON INDEX public.idx_products_cfop IS 'Índice para busca de produtos por CFOP';

-- Índice para pedidos com external_order_id (integração)
CREATE INDEX IF NOT EXISTS idx_orders_external_id 
ON public.orders(company_id, external_order_id) 
WHERE external_order_id IS NOT NULL;

COMMENT ON INDEX public.idx_orders_external_id IS 'Índice para busca por ID externo (iFood, 99Food)';

-- Índice para entregadores por avaliação
CREATE INDEX IF NOT EXISTS idx_entregadores_rating 
ON public.entregadores(company_id, rating DESC) 
WHERE active = true;

COMMENT ON INDEX public.idx_entregadores_rating IS 'Índice para ordenar entregadores por avaliação';

-- Índice para notas fiscais por CPF/CNPJ do cliente
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cpf_cnpj 
ON public.notas_fiscais(company_id, cpf_cnpj_cliente) 
WHERE cpf_cnpj_cliente IS NOT NULL;

COMMENT ON INDEX public.idx_notas_fiscais_cpf_cnpj IS 'Índice para busca de notas por CPF/CNPJ do cliente';

-- ============================================================================
-- Análise de performance das tabelas principais
-- ============================================================================

-- Atualizar estatísticas das tabelas modificadas
ANALYZE public.orders;
ANALYZE public.products;
ANALYZE public.entregadores;
ANALYZE public.notas_fiscais;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
/*
DROP INDEX IF EXISTS public.idx_notas_fiscais_cpf_cnpj;
DROP INDEX IF EXISTS public.idx_entregadores_rating;
DROP INDEX IF EXISTS public.idx_orders_external_id;
DROP INDEX IF EXISTS public.idx_products_cfop;
DROP INDEX IF EXISTS public.idx_products_ncm;
DROP INDEX IF EXISTS public.idx_orders_delivery_date_status;
*/
