-- Drop the restrictive check constraint on payment_method
-- This allows any payment method value to be stored
ALTER TABLE IF EXISTS public.pagamentos 
DROP CONSTRAINT IF EXISTS pagamentos_payment_method_check;

