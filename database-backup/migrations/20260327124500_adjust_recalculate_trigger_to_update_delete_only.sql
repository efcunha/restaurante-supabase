-- ============================================================================
-- Migration: 20260327124500
-- Ajusta trigger de recálculo para NÃO executar em INSERT.
-- Motivo: o fluxo atual de criação já usa adicionar_consumo_atomico,
-- e INSERT trigger gera dupla contagem (total_consumed dobrado).
-- Mantemos cobertura para consolidação/cancelamento via UPDATE/DELETE.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_recalculate_comanda_on_order_change ON public.orders;

CREATE TRIGGER trg_recalculate_comanda_on_order_change
  AFTER DELETE
     OR UPDATE OF comanda_number, status, total_amount
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_comanda_totals_on_order_change();
