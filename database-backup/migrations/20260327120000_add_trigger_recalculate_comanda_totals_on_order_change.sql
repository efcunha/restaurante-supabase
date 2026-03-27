-- ============================================================================
-- Migration: 20260327120000
-- Trigger que recalcula total_consumed e open_balance na tabela comandas
-- automaticamente após INSERT, UPDATE ou DELETE em orders.
--
-- Motivação: o fluxo de consolidação de mesa faz PATCH direto na tabela orders
-- via REST/PostgREST (spec E2E e futuros caminhos externos), sem passar pelo
-- serviço SupabaseOrderService. O trigger garante consistência independente
-- do caminho de escrita.
-- ============================================================================

-- -----------------------------------------------------------------------
-- 1. Função do trigger
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_comanda_totals_on_order_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_date_key   text;
  v_cn_old     integer;   -- comanda_number anterior
  v_cn_new     integer;   -- comanda_number novo
  v_tc         numeric;   -- total_consumed calculado
  v_tp         numeric;   -- total_paid atual
BEGIN
  -- Determinar empresa / data e comanda números afetados
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_date_key   := OLD.date_key;
    v_cn_old     := OLD.comanda_number;
    v_cn_new     := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_date_key   := NEW.date_key;
    v_cn_old     := NULL;
    v_cn_new     := NEW.comanda_number;
  ELSE -- UPDATE
    v_company_id := NEW.company_id;
    v_date_key   := NEW.date_key;
    v_cn_old     := OLD.comanda_number;
    v_cn_new     := NEW.comanda_number;
  END IF;

  -- Recalcular comanda anterior (quando comanda_number mudou ou registro foi deletado)
  IF v_cn_old IS NOT NULL AND v_cn_old > 0
     AND (TG_OP = 'DELETE' OR v_cn_old IS DISTINCT FROM v_cn_new) THEN

    SELECT COALESCE(SUM(o.total_amount), 0)
      INTO v_tc
      FROM public.orders o
     WHERE o.company_id    = v_company_id
       AND o.date_key       = v_date_key
       AND o.comanda_number = v_cn_old
       AND o.status NOT IN ('cancelled', 'cancelada');

    SELECT COALESCE(c.total_paid, 0)
      INTO v_tp
      FROM public.comandas c
     WHERE c.company_id    = v_company_id
       AND c.date_key       = v_date_key
       AND c.comanda_number = v_cn_old::text
     LIMIT 1;

    UPDATE public.comandas
       SET total_consumed = v_tc,
           open_balance   = GREATEST(0, v_tc - v_tp),
           updated_at     = NOW()
     WHERE company_id    = v_company_id
       AND date_key       = v_date_key
       AND comanda_number = v_cn_old::text;
  END IF;

  -- Recalcular comanda nova / atual
  IF v_cn_new IS NOT NULL AND v_cn_new > 0 THEN

    SELECT COALESCE(SUM(o.total_amount), 0)
      INTO v_tc
      FROM public.orders o
     WHERE o.company_id    = v_company_id
       AND o.date_key       = v_date_key
       AND o.comanda_number = v_cn_new
       AND o.status NOT IN ('cancelled', 'cancelada');

    SELECT COALESCE(c.total_paid, 0)
      INTO v_tp
      FROM public.comandas c
     WHERE c.company_id    = v_company_id
       AND c.date_key       = v_date_key
       AND c.comanda_number = v_cn_new::text
     LIMIT 1;

    UPDATE public.comandas
       SET total_consumed = v_tc,
           open_balance   = GREATEST(0, v_tc - v_tp),
           updated_at     = NOW()
     WHERE company_id    = v_company_id
       AND date_key       = v_date_key
       AND comanda_number = v_cn_new::text;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------
-- 2. Dropar trigger anterior se já existir (idempotente)
-- -----------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_recalculate_comanda_on_order_change ON public.orders;

-- -----------------------------------------------------------------------
-- 3. Criar o trigger
--    Dispara em INSERT, UPDATE de campos relevantes e DELETE.
-- -----------------------------------------------------------------------
CREATE TRIGGER trg_recalculate_comanda_on_order_change
  AFTER INSERT OR DELETE
     OR UPDATE OF comanda_number, status, total_amount
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_comanda_totals_on_order_change();
