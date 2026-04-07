BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stone', 'cielo', 'pagbank', 'getnet')),
  terminal_id TEXT NOT NULL,
  hyperswitch_merchant_id TEXT NOT NULL,
  hyperswitch_profile_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_gateway_configs_company_unique UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  comanda_number TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cartao_credito', 'cartao_debito')),
  provider TEXT NOT NULL CHECK (provider IN ('stone', 'cielo', 'pagbank', 'getnet')),
  provider_payment_id TEXT NOT NULL,
  provider_status TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  auth_code TEXT,
  error_code TEXT,
  error_message TEXT,
  last_webhook_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_transactions_idempotency_unique UNIQUE (company_id, idempotency_key),
  CONSTRAINT payment_transactions_provider_payment_unique UNIQUE (provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_company_comanda
  ON public.payment_transactions (company_id, comanda_number, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_company_status
  ON public.payment_transactions (company_id, status, created_at DESC);

ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_gateway_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateway_configs_select_admin_company ON public.payment_gateway_configs;
CREATE POLICY payment_gateway_configs_select_admin_company
  ON public.payment_gateway_configs
  FOR SELECT
  USING (public.can_manage_company_profiles(company_id));

DROP POLICY IF EXISTS payment_gateway_configs_manage_admin_company ON public.payment_gateway_configs;
CREATE POLICY payment_gateway_configs_manage_admin_company
  ON public.payment_gateway_configs
  FOR ALL
  USING (public.can_manage_company_profiles(company_id))
  WITH CHECK (public.can_manage_company_profiles(company_id));

DROP POLICY IF EXISTS payment_transactions_select_same_company ON public.payment_transactions;
CREATE POLICY payment_transactions_select_same_company
  ON public.payment_transactions
  FOR SELECT
  USING (
    company_id = (
      SELECT profiles.company_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS payment_gateway_configs_set_updated_at ON public.payment_gateway_configs;
CREATE TRIGGER payment_gateway_configs_set_updated_at
  BEFORE UPDATE ON public.payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS payment_transactions_set_updated_at ON public.payment_transactions;
CREATE TRIGGER payment_transactions_set_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;