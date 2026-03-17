-- Prevent two open comandas for the same table in the same company/day.
-- NOTE: This only applies to non-empty table_number values.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_mesa
ON public.comandas (company_id, date_key, (btrim(table_number)))
WHERE status = 'aberta'
  AND table_number IS NOT NULL
  AND btrim(table_number) <> '';

COMMENT ON INDEX public.idx_unique_open_mesa IS
  'Guarantees one open comanda per table (company/day), preventing concurrent mesa collisions.';
