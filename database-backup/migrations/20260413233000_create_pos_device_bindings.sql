BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  terminal_id TEXT NOT NULL,
  device_role TEXT NOT NULL CHECK (device_role IN ('tef_terminal', 'scale', 'receipt_printer')),
  vendor_id TEXT,
  product_id TEXT,
  serial_number TEXT,
  device_path TEXT,
  protocol TEXT,
  baud INTEGER,
  provider_terminal_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_device_bindings_unique_role_active
  ON public.pos_device_bindings (company_id, terminal_id, device_role)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pos_device_bindings_company_terminal
  ON public.pos_device_bindings (company_id, terminal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_device_bindings_company_role
  ON public.pos_device_bindings (company_id, device_role, is_active);

CREATE INDEX IF NOT EXISTS idx_pos_device_bindings_fingerprint
  ON public.pos_device_bindings (company_id, vendor_id, product_id, serial_number)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pos_device_bindings_last_seen
  ON public.pos_device_bindings (company_id, last_seen_at DESC)
  WHERE is_active = true;

ALTER TABLE public.pos_device_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_device_bindings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_device_bindings_service_role_manage ON public.pos_device_bindings;
CREATE POLICY pos_device_bindings_service_role_manage
  ON public.pos_device_bindings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS pos_device_bindings_select_same_company ON public.pos_device_bindings;
CREATE POLICY pos_device_bindings_select_same_company
  ON public.pos_device_bindings
  FOR SELECT
  USING (
    company_id = (
      SELECT profiles.company_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pos_device_bindings_manage_admin_company ON public.pos_device_bindings;
CREATE POLICY pos_device_bindings_manage_admin_company
  ON public.pos_device_bindings
  FOR ALL
  USING (public.can_manage_company_profiles(company_id))
  WITH CHECK (public.can_manage_company_profiles(company_id));

DROP TRIGGER IF EXISTS pos_device_bindings_set_updated_at ON public.pos_device_bindings;
CREATE TRIGGER pos_device_bindings_set_updated_at
  BEFORE UPDATE ON public.pos_device_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.pos_device_bindings IS
  'Bindings de hardware por company/terminal para TEF, balanca e impressora.';

COMMENT ON COLUMN public.pos_device_bindings.device_role IS
  'Papel logico do dispositivo: tef_terminal, scale, receipt_printer.';

COMMENT ON COLUMN public.pos_device_bindings.metadata IS
  'Metadados operacionais adicionais (nao sensiveis) para troubleshooting.';

COMMIT;
