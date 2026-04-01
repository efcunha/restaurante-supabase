-- =============================================================================
-- Migration: 20260401160000_optimize_profiles_rls_query_performance.sql
-- Purpose  : Optimize the can_manage_company_profiles() function query that is
--            called on every SELECT to public.profiles via RLS policy.
--            The query uses company_id and role filters that need better indexing.
-- =============================================================================

-- Create a composite index covering the can_manage_company_profiles query:
-- WHERE id = auth.uid()
--   AND company_id = target_company_id
--   AND role IN ('admin', 'gerente')
--   AND active IS DISTINCT FROM false
CREATE INDEX IF NOT EXISTS idx_profiles_can_manage_company
  ON public.profiles USING btree (id, company_id, role, active)
  WHERE role = ANY (ARRAY['admin'::TEXT, 'gerente'::TEXT])
    AND active IS TRUE;

COMMENT ON INDEX public.idx_profiles_can_manage_company IS
  'Composite index for can_manage_company_profiles RLS function.
   Covers auth.uid(), company_id filter, and active status.
   Partial index only for admin/gerente roles with active=true.';

-- Also create an index on (company_id, id, role) for potential company profile listings
CREATE INDEX IF NOT EXISTS idx_profiles_by_company_and_role
  ON public.profiles USING btree (company_id, id, role)
  WHERE active IS TRUE;

COMMENT ON INDEX public.idx_profiles_by_company_and_role IS
  'Index for listing/filtering profiles by company and role.
   Helps with batch profile operations and company admin views.';

-- Update table statistics to help query planner
ANALYZE public.profiles;
