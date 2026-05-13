-- =====================================================
-- Migration: Fix adicionar_consumo_atomico parameter type mismatch
-- Date: 2026-03-14
-- Purpose: Preserve the current RPC contract used by app/web while casting
--          parameters to the real column types in `comandas`.
-- Problem: `company_id` is UUID, `date_key` is DATE, and `comanda_number`
--          is INTEGER in the table, but the RPC receives TEXT params.
--          Without casts, Postgres raises errors such as
--          "operator does not exist: uuid = text".
-- =====================================================

CREATE OR REPLACE FUNCTION adicionar_consumo_atomico(
  p_company_id TEXT,
  p_date_key TEXT,
  p_comanda_number TEXT,
  p_valor NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE comandas
  SET
    total_consumed = COALESCE(total_consumed, 0) + p_valor,
    open_balance = GREATEST(0, COALESCE(total_consumed, 0) + p_valor - COALESCE(total_paid, 0)),
    updated_at = NOW()
  WHERE
    company_id = p_company_id::uuid
    AND date_key = p_date_key::date
    AND comanda_number = p_comanda_number::integer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda % não encontrada para a empresa % na data %',
      p_comanda_number, p_company_id, p_date_key;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION adicionar_consumo_atomico(TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION adicionar_consumo_atomico(TEXT, TEXT, TEXT, NUMERIC) TO anon;
