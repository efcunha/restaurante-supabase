-- Add technical status for consolidated comandas and traceability columns.
ALTER TABLE public.comandas
DROP CONSTRAINT IF EXISTS comandas_status_check;

ALTER TABLE public.comandas
ADD CONSTRAINT comandas_status_check CHECK (
  status = ANY (ARRAY['aberta'::text, 'fechada'::text, 'cancelada'::text, 'paga'::text, 'merged'::text])
);

ALTER TABLE public.comandas
ADD COLUMN IF NOT EXISTS merged_into_comanda_number integer,
ADD COLUMN IF NOT EXISTS merged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS merged_by uuid,
ADD COLUMN IF NOT EXISTS merge_reason text;

CREATE INDEX IF NOT EXISTS idx_comandas_merged_into
ON public.comandas (company_id, date_key, merged_into_comanda_number)
WHERE status = 'merged';

COMMENT ON COLUMN public.comandas.merged_into_comanda_number IS
'Numero da comanda canônica de destino quando a comanda foi consolidada (status=merged).';
