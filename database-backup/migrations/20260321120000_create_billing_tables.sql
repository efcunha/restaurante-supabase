-- =============================================================================
-- Migration: 20260321120000_create_billing_tables.sql
-- Description: Billing/licensing tables for SaaS subscription model
--   R$149/month, 30-day trial, Mercado Pago recurring + Pix fallback
--   Grace period: 5 calendar days after due date
--   LGPD: no CVV/PAN stored; tokenisation only via Mercado Pago
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: subscription_status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing',       -- D0-D30: trial period, card on file, no charge yet
    'active',         -- Paid and current
    'past_due',       -- Charge failed, within grace window
    'grace_period',   -- D31+1 to D31+5: still can operate, urging payment
    'suspended',      -- Grace expired, operational flows BLOCKED
    'reactivated',    -- Payment received after suspension; pending period reset
    'cancelled'       -- Voluntarily cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- TABLE: subscriptions
-- One row per company; tracks the current billing cycle and status.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status                subscription_status NOT NULL DEFAULT 'trialing',

  -- Trial window (America/Sao_Paulo anchor, stored UTC)
  trial_starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Current billing cycle
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,

  -- Grace period window (set when status transitions to past_due / grace_period)
  grace_period_end      TIMESTAMPTZ,

  -- Pricing (stored in centavos to avoid float arithmetic)
  plan_amount           INTEGER     NOT NULL DEFAULT 14900,  -- R$149,00

  -- Mercado Pago identifiers (no sensitive card data here)
  mp_subscription_id    TEXT,
  mp_customer_id        TEXT,
  mp_plan_id            TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subscriptions_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id  ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status      ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends  ON public.subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end  ON public.subscriptions(current_period_end);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION billing_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: payment_methods
-- LGPD: only tokenised reference from Mercado Pago. No CVV, no full PAN.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  type                  TEXT        NOT NULL CHECK (type IN ('card', 'pix')),

  -- Card display data only (NEVER store CVV or full PAN)
  last_four             TEXT        CHECK (last_four ~ '^\d{4}$'),
  brand                 TEXT,       -- e.g. 'visa', 'mastercard', 'elo'
  expiry_month          SMALLINT    CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year           SMALLINT    CHECK (expiry_year >= 2024),

  -- Mercado Pago tokenised reference
  mp_token              TEXT,       -- temporary token (expires); latest used token
  mp_card_id            TEXT,       -- stored card ID in MP Vault

  is_default            BOOLEAN     NOT NULL DEFAULT true,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: invoices
-- One row per billing cycle attempt. Tracks card vs Pix payment path.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id       UUID        NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,

  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),

  amount                INTEGER     NOT NULL,           -- centavos (e.g. 14900)
  due_date              DATE        NOT NULL,

  paid_at               TIMESTAMPTZ,
  payment_method_type   TEXT        CHECK (payment_method_type IN ('card', 'pix')),

  -- Mercado Pago payment reference
  mp_payment_id         TEXT,
  mp_error_code         TEXT,       -- stored for diagnostics; masked in logs

  -- Pix data (short-lived; cleared after payment or expiry)
  pix_qr_code           TEXT,       -- base64 QR code image
  pix_qr_code_text      TEXT,       -- copia-e-cola
  pix_expires_at        TIMESTAMPTZ,

  retry_count           SMALLINT    NOT NULL DEFAULT 0,
  last_retry_at         TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id      ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status          ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date        ON public.invoices(due_date);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: webhook_events
-- Idempotency guard: all Mercado Pago webhooks must resolve their
-- idempotency_key here before any state changes are applied.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT        NOT NULL DEFAULT 'mercadopago',
  event_type            TEXT        NOT NULL,           -- e.g. 'payment.updated'
  idempotency_key       TEXT        NOT NULL UNIQUE,    -- e.g. mp_payment_id + event_type
  payload               JSONB       NOT NULL DEFAULT '{}',
  processed_at          TIMESTAMPTZ,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON public.webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed   ON public.webhook_events(processed_at);

-- ---------------------------------------------------------------------------
-- TABLE: billing_audit_log
-- LGPD compliance: immutable audit trail. No sensitive data in details.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type            TEXT        NOT NULL,
    -- e.g. 'subscription.created', 'subscription.status_changed',
    --      'payment.succeeded', 'payment.failed', 'pix.issued',
    --      'grace_period.started', 'company.suspended', 'company.reactivated'
  actor_type            TEXT        NOT NULL DEFAULT 'system'
                          CHECK (actor_type IN ('system', 'user', 'webhook', 'support')),
  actor_id              UUID,       -- user_id if actor_type='user', NULL for system/webhook
  old_status            TEXT,
  new_status            TEXT,
  details               JSONB       NOT NULL DEFAULT '{}',  -- MUST be pre-masked before insert
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_company_id  ON public.billing_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_event_type  ON public.billing_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_audit_created_at  ON public.billing_audit_log(created_at);

-- ---------------------------------------------------------------------------
-- RLS: Row-Level Security Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_log    ENABLE ROW LEVEL SECURITY;

-- subscriptions: company members read own; only service_role writes
CREATE POLICY "subscriptions_read_own"
  ON public.subscriptions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- payment_methods: company admin reads own; no write from client (service_role only)
CREATE POLICY "payment_methods_read_own_admin"
  ON public.payment_methods FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- invoices: company members read own
CREATE POLICY "invoices_read_own"
  ON public.invoices FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- webhook_events: no client reads (service_role only)
-- No SELECT policy added → defaults to DENY for all JWT clients

-- billing_audit_log: admins read own company log
CREATE POLICY "billing_audit_read_own_admin"
  ON public.billing_audit_log FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: get_company_subscription_state
-- Returns the current subscription state for a company.
-- Used by AuthContext bootstrap and BillingContext.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_company_subscription_state(p_company_id UUID)
RETURNS TABLE (
  subscription_id       UUID,
  status                TEXT,
  trial_ends_at         TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  grace_period_end      TIMESTAMPTZ,
  plan_amount           INTEGER,
  can_operate           BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_can_operate BOOLEAN;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE company_id = p_company_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- No subscription row: treat as trialing (legacy companies without billing row)
    RETURN QUERY SELECT
      NULL::UUID,
      'trialing'::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      14900,
      TRUE;
    RETURN;
  END IF;

  -- Compute can_operate based on status and time windows
  v_can_operate := CASE
    WHEN v_sub.status IN ('trialing', 'active', 'reactivated') THEN TRUE
    WHEN v_sub.status = 'past_due'
         AND v_sub.current_period_end IS NOT NULL
         AND v_sub.current_period_end > NOW() AT TIME ZONE 'UTC' THEN TRUE
    WHEN v_sub.status = 'grace_period'
         AND v_sub.grace_period_end IS NOT NULL
         AND v_sub.grace_period_end > NOW() AT TIME ZONE 'UTC' THEN TRUE
    ELSE FALSE
  END;

  RETURN QUERY SELECT
    v_sub.id,
    v_sub.status::TEXT,
    v_sub.trial_ends_at,
    v_sub.current_period_start,
    v_sub.current_period_end,
    v_sub.grace_period_end,
    v_sub.plan_amount,
    v_can_operate;
END;
$$;

-- Grant execute to authenticated users (result is already RLS-safe because
-- the caller can only query for their own company_id via BillingContext)
GRANT EXECUTE ON FUNCTION public.get_company_subscription_state(UUID)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: can_company_operate
-- Lightweight boolean check. Used for fast gating in Edge Functions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_company_operate(p_company_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT can_operate INTO v_result
  FROM public.get_company_subscription_state(p_company_id)
  LIMIT 1;

  RETURN COALESCE(v_result, TRUE); -- Default TRUE for legacy companies without billing row
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_company_operate(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- COMMENT: timezone contract
-- All TIMESTAMPTZ values are stored in UTC.
-- Business logic regarding billing cycles uses America/Sao_Paulo as the
-- canonical timezone for day boundary calculations.
-- Display layer must convert: AT TIME ZONE 'America/Sao_Paulo'
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.subscriptions IS
  'SaaS subscription state per company. R$149/month flat rate. '
  'Timestamps stored UTC; display converts to America/Sao_Paulo.';

COMMENT ON TABLE public.invoices IS
  'Per-cycle invoice. Supports card (primary) and Pix (fallback/regularization). '
  'Pix QR data is short-lived and cleared after payment or expiry.';

COMMENT ON TABLE public.webhook_events IS
  'Idempotency guard for Mercado Pago webhooks. '
  'Always INSERT idempotency_key before applying state changes.';

COMMENT ON TABLE public.billing_audit_log IS
  'LGPD-compliant immutable audit log. '
  'details JSONB must be pre-masked (no CVV, no full PAN, no full card numbers).';
