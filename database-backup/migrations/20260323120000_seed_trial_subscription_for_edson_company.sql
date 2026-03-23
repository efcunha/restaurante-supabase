-- =============================================================================
-- Migration: 20260323120000_seed_trial_subscription_for_edson_company.sql
-- Description: Seeds a trial subscription for the test company identified by
--   admin email `edsonfcunha68@gmail.com`, only when the company has no
--   existing subscription row.
-- Safety:
--   - Idempotent (insert-if-missing by company_id)
--   - No updates to existing subscriptions
--   - No-op when target email is not found in this environment
-- =============================================================================

WITH target_company AS (
  SELECT DISTINCT p.company_id
  FROM public.profiles p
  WHERE lower(trim(p.email)) = 'edsonfcunha68@gmail.com'
    AND p.company_id IS NOT NULL
  LIMIT 1
),
inserted_subscription AS (
  INSERT INTO public.subscriptions (
    company_id,
    status,
    trial_starts_at,
    trial_ends_at,
    plan_amount,
    created_at,
    updated_at
  )
  SELECT
    tc.company_id,
    'trialing'::public.subscription_status,
    NOW(),
    NOW() + INTERVAL '30 days',
    14900,
    NOW(),
    NOW()
  FROM target_company tc
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.company_id = tc.company_id
  )
  RETURNING id, company_id, status, trial_ends_at
)
INSERT INTO public.billing_audit_log (
  company_id,
  event_type,
  actor_type,
  old_status,
  new_status,
  details,
  created_at
)
SELECT
  i.company_id,
  'subscription.trial_seeded',
  'support',
  NULL,
  i.status::text,
  jsonb_build_object(
    'source_migration', '20260323120000_seed_trial_subscription_for_edson_company.sql',
    'target_email', 'edsonfcunha68@gmail.com',
    'seed_mode', 'insert_if_missing',
    'trial_ends_at', i.trial_ends_at
  ),
  NOW()
FROM inserted_subscription i;