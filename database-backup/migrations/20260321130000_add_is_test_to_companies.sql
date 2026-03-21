-- =============================================================================
-- Migration: 20260321130000_add_is_test_to_companies.sql
-- Description: Adds is_test flag to companies table.
--   Companies marked as is_test = true are permanently exempt from billing
--   enforcement (canOperate always true, no LicenseGate, no status checks).
--   Use for: internal test accounts, demo restaurants, staging seeds.
-- =============================================================================

-- 1. Add column
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.is_test IS
  'When true, this company is exempt from all billing/subscription enforcement. '
  'Use only for internal test accounts and demo restaurants.';

-- 2. Update get_company_subscription_state RPC to short-circuit for test companies
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
  v_sub     public.subscriptions%ROWTYPE;
  v_is_test BOOLEAN;
  v_can_op  BOOLEAN;
BEGIN
  -- Check if company is a test account (exempt from all billing rules)
  SELECT is_test INTO v_is_test
  FROM public.companies
  WHERE id = p_company_id;

  IF v_is_test IS TRUE THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'trialing'::TEXT,
      (NOW() + INTERVAL '9999 days')::TIMESTAMPTZ,  -- effectively never expires
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      0,
      TRUE;
    RETURN;
  END IF;

  -- Normal path
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

  v_can_op := CASE
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
    v_can_op;
END;
$$;

-- 3. Mark the company registered today as a test company.
--    Replace the WHERE clause with the actual company name or ID if known.
--    Run this manually after confirming the target company.
--
-- UPDATE public.companies
--   SET is_test = true
-- WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
--   AND is_test = false;  -- safety: only affects rows not already marked
--
-- To verify before running:
-- SELECT id, name, created_at, is_test
-- FROM public.companies
-- WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE;
