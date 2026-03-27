-- Add idempotency guard to prevent duplicate payment inserts
-- for the same delivery order (identified by company_id, comanda_number, date_key, amount, payment_method tuple)

-- Create a unique partial index that allows multiple payments per comanda
-- only if they differ in amount, payment method, or date_key
-- This prevents exact duplicate payment records while allowing legitimate multiple payments
CREATE UNIQUE INDEX CONCURRENTLY idx_pagamentos_idempotent
ON public.pagamentos (company_id, comanda_number, date_key, amount, payment_method)
WHERE payment_method IS NOT NULL
AND received_by_name = 'Activepieces Delivery';

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_pagamentos_idempotent IS 
'Idempotency guard for Activepieces delivery payments. Prevents duplicate payment records '
'when the same webhook event is retried or replayed. Only applies to payments logged '
'via Activepieces (received_by_name = "Activepieces Delivery"). '
'Violation returns HTTP 409 Conflict; application must handle gracefully.';
