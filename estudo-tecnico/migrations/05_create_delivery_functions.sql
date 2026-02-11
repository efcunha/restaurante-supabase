-- ============================================================================
-- Migration: 05_create_delivery_functions.sql
-- Description: Funções auxiliares para gestão de delivery
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Função para despachar pedido (atribuir entregador e marcar como despachado)
CREATE OR REPLACE FUNCTION public.dispatch_order(
  p_order_id UUID,
  p_delivery_person_id UUID,
  p_dispatched_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_entregador RECORD;
BEGIN
  -- Buscar pedido
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pedido não encontrado'
    );
  END IF;
  
  -- Verificar se é pedido delivery
  IF v_order.order_source = 'local' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pedido não é delivery'
    );
  END IF;
  
  -- Buscar entregador
  SELECT * INTO v_entregador
  FROM public.entregadores
  WHERE id = p_delivery_person_id AND active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entregador não encontrado ou inativo'
    );
  END IF;
  
  -- Atualizar pedido
  UPDATE public.orders
  SET 
    delivery_person_id = p_delivery_person_id,
    dispatched_at = NOW(),
    status = 'delivered', -- ou criar novo status 'dispatched'
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Incrementar contador do entregador
  UPDATE public.entregadores
  SET 
    current_deliveries_today = current_deliveries_today + 1,
    total_deliveries = total_deliveries + 1
  WHERE id = p_delivery_person_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'delivery_person', v_entregador.name,
    'dispatched_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.dispatch_order IS 'Despacha um pedido atribuindo um entregador';

-- Função para calcular taxa de entrega baseada em distância
CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(
  p_distance_km NUMERIC,
  p_company_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_base_fee NUMERIC := 5.00;
  v_per_km_fee NUMERIC := 2.00;
  v_min_fee NUMERIC := 3.00;
  v_max_fee NUMERIC := 20.00;
  v_calculated_fee NUMERIC;
BEGIN
  -- Calcular taxa: base + (distância * taxa por km)
  v_calculated_fee := v_base_fee + (p_distance_km * v_per_km_fee);
  
  -- Aplicar limites mínimo e máximo
  v_calculated_fee := GREATEST(v_calculated_fee, v_min_fee);
  v_calculated_fee := LEAST(v_calculated_fee, v_max_fee);
  
  RETURN ROUND(v_calculated_fee, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_delivery_fee IS 'Calcula taxa de entrega baseada na distância';

-- Função para obter entregadores disponíveis
CREATE OR REPLACE FUNCTION public.get_available_delivery_persons(
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  phone TEXT,
  vehicle_type TEXT,
  current_deliveries INTEGER,
  max_deliveries INTEGER,
  rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.phone,
    e.vehicle_type,
    e.current_deliveries_today,
    e.max_deliveries_per_day,
    e.rating
  FROM public.entregadores e
  WHERE 
    e.company_id = p_company_id
    AND e.active = true
    AND e.current_deliveries_today < e.max_deliveries_per_day
  ORDER BY 
    e.current_deliveries_today ASC,
    e.rating DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_available_delivery_persons IS 'Retorna entregadores disponíveis ordenados por carga e avaliação';

-- Função para obter estatísticas de delivery
CREATE OR REPLACE FUNCTION public.get_delivery_stats(
  p_company_id UUID,
  p_date_start DATE DEFAULT CURRENT_DATE,
  p_date_end DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_deliveries', COUNT(*),
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'avg_delivery_time_minutes', COALESCE(AVG(
      EXTRACT(EPOCH FROM (dispatched_at - created_at)) / 60
    ), 0),
    'by_source', jsonb_object_agg(
      order_source, 
      COUNT(*)
    ),
    'by_status', jsonb_object_agg(
      status,
      COUNT(*)
    )
  ) INTO v_stats
  FROM public.orders
  WHERE 
    company_id = p_company_id
    AND order_source != 'local'
    AND date_key BETWEEN p_date_start AND p_date_end;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_delivery_stats IS 'Retorna estatísticas de delivery para um período';

-- ============================================================================
-- ROLLBACK
-- ============================================================================
/*
DROP FUNCTION IF EXISTS public.get_delivery_stats(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_available_delivery_persons(UUID);
DROP FUNCTION IF EXISTS public.calculate_delivery_fee(NUMERIC, UUID);
DROP FUNCTION IF EXISTS public.dispatch_order(UUID, UUID, UUID);
*/
