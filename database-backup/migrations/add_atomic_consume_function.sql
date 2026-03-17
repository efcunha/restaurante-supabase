-- =====================================================
-- Function: adicionar_consumo_atomico
-- Purpose: Incrementa total_consumed e open_balance de forma atômica (sem READ-MODIFY-WRITE)
-- Evita race condition quando múltiplos garçons adicionam pedidos à mesma comanda simultaneamente.
-- =====================================================

CREATE OR REPLACE FUNCTION adicionar_consumo_atomico(
  p_company_id  TEXT,
  p_date_key    TEXT,
  p_comanda_number TEXT,
  p_valor       NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE comandas
  SET
    total_consumed = COALESCE(total_consumed, 0) + p_valor,
    open_balance   = GREATEST(0, COALESCE(total_consumed, 0) + p_valor - COALESCE(total_paid, 0)),
    updated_at     = NOW()
  WHERE
    company_id     = p_company_id::uuid
    AND date_key   = p_date_key::date
    AND comanda_number = p_comanda_number::integer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda % não encontrada para a empresa % na data %',
      p_comanda_number, p_company_id, p_date_key;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION adicionar_consumo_atomico(TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION adicionar_consumo_atomico(TEXT, TEXT, TEXT, NUMERIC) TO anon;
