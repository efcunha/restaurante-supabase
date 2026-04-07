-- Reconciliation migration (remote-first)
-- Version 20260407105516 exists in remote history with name
-- `create_payment_gateway_tables`, but was not committed to repository.
--
-- This no-op file preserves migration history ordering and prevents
-- local/remote drift checks from failing. The effective DDL is defined in:
-- 20260407123000_create_payment_gateway_tables.sql

BEGIN;

DO $$
BEGIN
  -- Intentionally no-op: repository reconciliation only.
  NULL;
END $$;

COMMIT;
