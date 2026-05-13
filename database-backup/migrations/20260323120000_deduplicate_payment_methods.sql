-- Migration: 20260323120000_deduplicate_payment_methods
-- Purpose: Remove duplicate card rows in payment_methods (same fingerprint per company)
--          and add a unique partial index to prevent future duplicates at the DB level.
--
-- Dedup strategy: for each (company_id, lower(brand), last_four, expiry_month, expiry_year)
--   keep the row with is_default DESC, created_at DESC  (mirrors BillingService dedup logic)
--   delete all others; only affects type = 'card'

-- ============================================================
-- 1. DELETE duplicate card rows
-- ============================================================
DELETE FROM public.payment_methods
WHERE id NOT IN (
  SELECT DISTINCT ON (
    company_id,
    lower(brand),
    last_four,
    expiry_month,
    expiry_year
  ) id
  FROM public.payment_methods
  WHERE type = 'card'
  ORDER BY
    company_id,
    lower(brand),
    last_four,
    expiry_month,
    expiry_year,
    is_default DESC,
    created_at DESC
)
AND type = 'card';

-- ============================================================
-- 2. Add unique partial index to prevent future duplicates
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_card_fingerprint
  ON public.payment_methods (company_id, lower(brand), last_four, expiry_month, expiry_year)
  WHERE type = 'card';
