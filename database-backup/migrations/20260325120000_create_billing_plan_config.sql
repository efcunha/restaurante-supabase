-- =============================================================================
-- Migration: 20260325120000_create_billing_plan_config.sql
-- Description: Dynamic billing plan configuration — replaces hardcoded R$149,00.
--
-- Goals:
--   - Single source of truth for plan price, currency, trial days live in DB
--   - No deploy required to change price; ops UI writes here
--   - Versioned by effective_from (immutable history, never overwrite)
--   - Fail-closed: edge functions must refuse to charge if no active config found
--   - Full before/after audit trail for every change (operator + reason)
--
-- Scope: global config (not per-company). One active config at a time.
-- Future: per-company plans = add company_id to plan_code scope.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: billing_plan_config
-- Versioned immutable config rows. Only one can be ACTIVE at a time within
-- a given plan_code. Closing the previous row (effective_to) is handled by
-- the upsert helper function below; never UPDATE existing rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_plan_config (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code         TEXT        NOT NULL DEFAULT 'default_monthly',
                                -- Identifies the plan type. Currently only one plan.
  amount_cents      INTEGER     NOT NULL,
  currency          TEXT        NOT NULL DEFAULT 'BRL',
  trial_days        SMALLINT    NOT NULL DEFAULT 30,
  status            TEXT        NOT NULL DEFAULT 'active',
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to      TIMESTAMPTZ,  -- NULL = currently active; set when superseded
  created_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT billing_plan_config_amount_positive  CHECK (amount_cents > 0),
  CONSTRAINT billing_plan_config_trial_non_neg    CHECK (trial_days >= 0),
  CONSTRAINT billing_plan_config_currency_format  CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_plan_config_status_valid     CHECK (status IN ('active', 'inactive', 'draft')),
  CONSTRAINT billing_plan_config_dates_order
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Uniqueness: only one open (effective_to IS NULL + status=active) row per plan_code.
-- Partial unique index — allows multiple historical rows but only one current active.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_billing_plan_config_active_plan
  ON public.billing_plan_config (plan_code)
  WHERE status = 'active' AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_plan_config_plan_code
  ON public.billing_plan_config (plan_code, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_billing_plan_config_status
  ON public.billing_plan_config (status);

-- Auto-update updated_at (reuse existing trigger function billing_set_updated_at)
DROP TRIGGER IF EXISTS trg_billing_plan_config_updated_at ON public.billing_plan_config;
CREATE TRIGGER trg_billing_plan_config_updated_at
  BEFORE UPDATE ON public.billing_plan_config
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: billing_plan_config_audit
-- Immutable before/after log for every plan config change.
-- Required for reconciliation: know the exact price in effect at any moment.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_plan_config_audit (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id         UUID        NOT NULL REFERENCES public.billing_plan_config(id) ON DELETE CASCADE,
  plan_code         TEXT        NOT NULL,
  action            TEXT        NOT NULL CHECK (action IN ('created', 'activated', 'superseded', 'deactivated')),
  before_snapshot   JSONB,      -- NULL on first creation
  after_snapshot    JSONB       NOT NULL,
  changed_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason     TEXT,       -- Freeform operator note (required via app layer)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_plan_config_audit_config_id
  ON public.billing_plan_config_audit (config_id);

CREATE INDEX IF NOT EXISTS idx_billing_plan_config_audit_created_at
  ON public.billing_plan_config_audit (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_plan_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_config_audit  ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions, ops backend) has full access via SECURITY DEFINER functions.
-- Authenticated clients cannot read plan config directly (price discovery happens via RPC).
-- No client-facing SELECT policy here.

-- Ops admins can read config history via the audit function below (not direct table access).

-- ---------------------------------------------------------------------------
-- FUNCTION: get_active_billing_plan_config
-- Returns the current active plan config for a given plan_code.
-- SECURITY DEFINER so edge functions using anon/service role can call it safely.
-- Fail-closed: returns NULL if no valid active config found.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_billing_plan_config(
  p_plan_code TEXT DEFAULT 'default_monthly'
)
RETURNS TABLE (
  id            UUID,
  plan_code     TEXT,
  amount_cents  INTEGER,
  currency      TEXT,
  trial_days    SMALLINT,
  effective_from TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.plan_code,
    c.amount_cents,
    c.currency,
    c.trial_days,
    c.effective_from
  FROM public.billing_plan_config c
  WHERE
    c.plan_code    = p_plan_code
    AND c.status   = 'active'
    AND c.effective_to IS NULL
    AND c.effective_from <= NOW()
  ORDER BY c.effective_from DESC
  LIMIT 1;
END;
$$;

-- Allow authenticated users and service role to call this (price is not sensitive info)
GRANT EXECUTE ON FUNCTION public.get_active_billing_plan_config(TEXT)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- FUNCTION: activate_billing_plan_config
-- Safe transition: closes the current active row and inserts a new active row.
-- Records before/after in audit trail.
-- Must be called by ops backend (service_role). Not callable by clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_billing_plan_config(
  p_plan_code       TEXT,
  p_amount_cents    INTEGER,
  p_currency        TEXT,
  p_trial_days      SMALLINT,
  p_effective_from  TIMESTAMPTZ,
  p_changed_by      UUID,
  p_change_reason   TEXT
)
RETURNS UUID  -- returns new config id
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_old_id      UUID;
  v_old_snap    JSONB;
  v_new_id      UUID;
  v_new_snap    JSONB;
BEGIN
  -- Validate inputs
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive';
  END IF;
  IF p_trial_days < 0 THEN
    RAISE EXCEPTION 'trial_days must be non-negative';
  END IF;
  IF p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'currency must be a 3-letter ISO code';
  END IF;
  IF p_change_reason IS NULL OR trim(p_change_reason) = '' THEN
    RAISE EXCEPTION 'change_reason is required for audit trail';
  END IF;

  -- Close the current active row (if any)
  SELECT id,
    jsonb_build_object(
      'amount_cents',  amount_cents,
      'currency',      currency,
      'trial_days',    trial_days,
      'status',        status,
      'effective_from', effective_from,
      'effective_to',  effective_to
    )
  INTO v_old_id, v_old_snap
  FROM public.billing_plan_config
  WHERE plan_code = p_plan_code
    AND status = 'active'
    AND effective_to IS NULL
  LIMIT 1;

  IF v_old_id IS NOT NULL THEN
    UPDATE public.billing_plan_config
    SET
      effective_to = p_effective_from,
      status       = 'inactive',
      updated_at   = NOW()
    WHERE id = v_old_id;

    -- Audit: record supersession
    INSERT INTO public.billing_plan_config_audit
      (config_id, plan_code, action, before_snapshot, after_snapshot, changed_by, change_reason)
    VALUES (
      v_old_id,
      p_plan_code,
      'superseded',
      v_old_snap,
      jsonb_set(v_old_snap, '{status}', '"inactive"'),
      p_changed_by,
      p_change_reason
    );
  END IF;

  -- Insert new active config
  INSERT INTO public.billing_plan_config
    (plan_code, amount_cents, currency, trial_days, status, effective_from, effective_to,
     created_by, updated_by)
  VALUES
    (p_plan_code, p_amount_cents, p_currency, p_trial_days, 'active', p_effective_from, NULL,
     p_changed_by, p_changed_by)
  RETURNING id INTO v_new_id;

  v_new_snap := jsonb_build_object(
    'amount_cents',   p_amount_cents,
    'currency',       p_currency,
    'trial_days',     p_trial_days,
    'status',         'active',
    'effective_from', p_effective_from,
    'effective_to',   NULL
  );

  -- Audit: record creation/activation
  INSERT INTO public.billing_plan_config_audit
    (config_id, plan_code, action, before_snapshot, after_snapshot, changed_by, change_reason)
  VALUES (
    v_new_id,
    p_plan_code,
    CASE WHEN v_old_id IS NULL THEN 'created' ELSE 'activated' END,
    v_old_snap,
    v_new_snap,
    p_changed_by,
    p_change_reason
  );

  RETURN v_new_id;
END;
$$;

-- Only service_role may change plan config (ops backend runs as service_role)
GRANT EXECUTE ON FUNCTION public.activate_billing_plan_config(TEXT, INTEGER, TEXT, SMALLINT, TIMESTAMPTZ, UUID, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- FUNCTION: get_billing_plan_config_at
-- Resolves the plan config that was active at a specific point in time.
-- Used for reconciliation: "what was the price when this invoice was charged?"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_billing_plan_config_at(
  p_at          TIMESTAMPTZ,
  p_plan_code   TEXT DEFAULT 'default_monthly'
)
RETURNS TABLE (
  id            UUID,
  plan_code     TEXT,
  amount_cents  INTEGER,
  currency      TEXT,
  trial_days    SMALLINT,
  effective_from TIMESTAMPTZ,
  effective_to  TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.plan_code,
    c.amount_cents,
    c.currency,
    c.trial_days,
    c.effective_from,
    c.effective_to
  FROM public.billing_plan_config c
  WHERE
    c.plan_code = p_plan_code
    AND c.effective_from <= p_at
    AND (c.effective_to IS NULL OR c.effective_to > p_at)
    AND c.status IN ('active', 'inactive')  -- include closed rows for historical lookup
  ORDER BY c.effective_from DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_plan_config_at(TIMESTAMPTZ, TEXT)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- SEED: Initial active config (replaces the hardcoded R$149,00 default)
-- Inserted only if no active config already exists.
-- effective_from = epoch of this migration so historical invoices can resolve it.
-- ---------------------------------------------------------------------------
INSERT INTO public.billing_plan_config
  (plan_code, amount_cents, currency, trial_days, status, effective_from, effective_to)
SELECT
  'default_monthly',
  14900,
  'BRL',
  30,
  'active',
  '2026-03-21 12:00:00+00',  -- anchor: date of original billing tables migration
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.billing_plan_config
  WHERE plan_code = 'default_monthly'
    AND status = 'active'
    AND effective_to IS NULL
);

-- Seed audit row for the initial config
INSERT INTO public.billing_plan_config_audit
  (config_id, plan_code, action, before_snapshot, after_snapshot, changed_by, change_reason)
SELECT
  c.id,
  'default_monthly',
  'created',
  NULL,
  jsonb_build_object(
    'amount_cents',   14900,
    'currency',       'BRL',
    'trial_days',     30,
    'status',         'active',
    'effective_from', '2026-03-21T12:00:00+00:00',
    'effective_to',   NULL
  ),
  NULL,
  'Migração inicial: valor canônico R$149,00 seed via 20260325120000'
FROM public.billing_plan_config c
WHERE c.plan_code = 'default_monthly'
  AND c.status = 'active'
  AND c.effective_to IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.billing_plan_config_audit a
    WHERE a.config_id = c.id
  )
LIMIT 1;

-- ---------------------------------------------------------------------------
-- Update get_company_subscription_state to return plan_amount from dynamic config
-- when the subscription row has the legacy DEFAULT 14900 and a dynamic config exists.
-- This keeps existing clients working while transitioning.
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
  v_sub          public.subscriptions%ROWTYPE;
  v_can_operate  BOOLEAN;
  v_plan_amount  INTEGER;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE company_id = p_company_id
  LIMIT 1;

  -- Resolve current plan amount from dynamic config (fail-open for display only).
  -- Do NOT rely on FOUND here — the second SELECT would overwrite it.
  -- Use v_sub.id IS NULL to check whether the subscription row was found.
  SELECT amount_cents INTO v_plan_amount
  FROM public.get_active_billing_plan_config('default_monthly')
  LIMIT 1;

  v_plan_amount := COALESCE(v_plan_amount, 14900);

  IF v_sub.id IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'trialing'::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      v_plan_amount,
      TRUE;
    RETURN;
  END IF;

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
    v_plan_amount,
    v_can_operate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_subscription_state(UUID)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.billing_plan_config IS
  'Dynamic billing plan configuration. Single source of truth for price/trial. '
  'Never update rows — insert new rows via activate_billing_plan_config(). '
  'effective_from anchors version; effective_to closes a version.';

COMMENT ON TABLE public.billing_plan_config_audit IS
  'Immutable before/after audit trail for every billing plan config change. '
  'Required for reconciliation: resolve the price in effect at any past moment.';

COMMENT ON FUNCTION public.get_active_billing_plan_config(TEXT) IS
  'Returns the currently active plan config. '
  'Returns no row (not an error) if no active config is found. '
  'Callers MUST treat empty result as fail-closed for charge operations.';

COMMENT ON FUNCTION public.activate_billing_plan_config(TEXT, INTEGER, TEXT, SMALLINT, TIMESTAMPTZ, UUID, TEXT) IS
  'Safe atomic transition: closes current active config and activates new one. '
  'Records full before/after audit trail. change_reason is mandatory.';

COMMENT ON FUNCTION public.get_billing_plan_config_at(TIMESTAMPTZ, TEXT) IS
  'Resolves the plan config active at a specific point in time. '
  'Use for invoice reconciliation: what was the price when this charge was made?';
