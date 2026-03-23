-- =====================================================
-- Function: get_next_delivery_comanda_number
-- Purpose: Generate next delivery comanda number with transaction lock
-- This prevents race conditions when multiple delivery orders are created simultaneously
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_delivery_comanda_number(
  p_company_id TEXT,
  p_date_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Lock the table to prevent race conditions
  -- This ensures only one transaction can generate a number at a time
  LOCK TABLE orders IN SHARE ROW EXCLUSIVE MODE;
  
  -- Get the maximum comanda_number for delivery orders today
  SELECT COALESCE(MAX(comanda_number), 0) + 1
  INTO v_next_number
  FROM orders
  WHERE company_id = p_company_id
    AND date_key = p_date_key
    AND order_type = 'delivery';
  
  RETURN v_next_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_delivery_comanda_number(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_delivery_comanda_number(TEXT, TEXT) TO anon;

-- Test the function (optional - comment out after testing)
-- SELECT get_next_delivery_comanda_number('your-company-id', '2026-03-09');
