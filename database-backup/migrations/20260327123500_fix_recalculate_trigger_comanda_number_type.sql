-- ============================================================================
-- Migration: 20260327123500
-- Ajusta o trigger de recálculo para comanda_number INTEGER (remote truth).
-- Evita erro: operator does not exist: integer = text
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_comanda_totals_on_order_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_date_key   date;
  v_cn_old     integer;
  v_cn_new     integer;
  v_tc         numeric;
  v_tp         numeric;
BEGIN
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
  ELSE
    v_company_id := NEW.company_id;
    v_date_key   := NEW.date_key;
    v_cn_old     := OLD.comanda_number;
    v_cn_new     := NEW.comanda_number;
  END IF;

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
       AND c.comanda_number = v_cn_old
     LIMIT 1;

    UPDATE public.comandas
       SET total_consumed = v_tc,
           open_balance   = GREATEST(0, v_tc - v_tp),
           updated_at     = NOW()
     WHERE company_id    = v_company_id
       AND date_key       = v_date_key
       AND comanda_number = v_cn_old;
  END IF;

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
       AND c.comanda_number = v_cn_new
     LIMIT 1;

    UPDATE public.comandas
       SET total_consumed = v_tc,
           open_balance   = GREATEST(0, v_tc - v_tp),
           updated_at     = NOW()
     WHERE company_id    = v_company_id
       AND date_key       = v_date_key
       AND comanda_number = v_cn_new;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
