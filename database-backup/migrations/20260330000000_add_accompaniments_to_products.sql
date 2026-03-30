-- Migration: add accompaniments field for products
-- Stores default side dishes for espetinho products (e.g. Farofa, Vinagrete)

BEGIN;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS accompaniments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.accompaniments IS
'Stores accompaniment names for a product (e.g. ["Farofa", "Vinagrete"]).';

COMMIT;
