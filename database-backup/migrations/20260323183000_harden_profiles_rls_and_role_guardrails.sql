-- =============================================================================
-- Migration: 20260323183000_harden_profiles_rls_and_role_guardrails.sql
-- Purpose  : Close permissive access on public.profiles and align role handling
--            with the app's current role model.
-- Security :
--   - Replaces SELECT USING (true) on public.profiles
--   - Restricts self-update to non-sensitive fields only
--   - Preserves same-company administrative access for admin/gerente
--   - Normalizes legacy role aliases before CHECK validation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role normalization helpers
-- Keep compatibility with legacy aliases while storing canonical values.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_profile_role(p_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE lower(trim(coalesce(p_role, '')))
    WHEN '' THEN 'garcom'
    WHEN 'admin' THEN 'admin'
    WHEN 'manager' THEN 'gerente'
    WHEN 'gerente' THEN 'gerente'
    WHEN 'waiter' THEN 'garcom'
    WHEN 'garcom' THEN 'garcom'
    WHEN 'kitchen' THEN 'cozinheiro'
    WHEN 'cozinheiro' THEN 'cozinheiro'
    WHEN 'cozinha' THEN 'cozinheiro'
    WHEN 'churrasqueiro' THEN 'cozinheiro'
    WHEN 'montagem' THEN 'montagem'
    WHEN 'entregador' THEN 'entregador'
    WHEN 'motoboy' THEN 'entregador'
    WHEN 'motorista' THEN 'entregador'
    WHEN 'caixa' THEN 'caixa'
    ELSE lower(trim(p_role))
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_profile_role(TEXT)
  FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_profile_role(TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.normalize_profile_role_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.role = public.normalize_profile_role(NEW.role);

  IF NEW.funcao IS NOT NULL AND btrim(NEW.funcao) <> '' THEN
    NEW.funcao = public.normalize_profile_role(NEW.funcao);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalize_profile_role_before_write()
  FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_profile_role_before_write()
  TO service_role;

DROP TRIGGER IF EXISTS normalize_profiles_role_on_write ON public.profiles;
CREATE TRIGGER normalize_profiles_role_on_write
  BEFORE INSERT OR UPDATE OF role, funcao ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_profile_role_before_write();

UPDATE public.profiles
SET
  role = public.normalize_profile_role(role),
  funcao = CASE
    WHEN funcao IS NULL OR btrim(funcao) = '' THEN funcao
    ELSE public.normalize_profile_role(funcao)
  END
WHERE role IS DISTINCT FROM public.normalize_profile_role(role)
   OR (
     funcao IS NOT NULL
     AND btrim(funcao) <> ''
     AND funcao IS DISTINCT FROM public.normalize_profile_role(funcao)
   );

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'garcom';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'admin'::TEXT,
        'gerente'::TEXT,
        'garcom'::TEXT,
        'cozinheiro'::TEXT,
        'montagem'::TEXT,
        'entregador'::TEXT,
        'caixa'::TEXT
      ]
    )
  );

DROP INDEX IF EXISTS public.idx_profiles_id_role;
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
  ON public.profiles USING btree (id, role)
  WHERE role = ANY (ARRAY['admin'::TEXT, 'gerente'::TEXT]);

COMMENT ON INDEX public.idx_profiles_id_role IS
  'Partial index for admin/gerente role checks in RLS policies.';

-- ---------------------------------------------------------------------------
-- Security-definer helpers for profiles RLS
-- Avoid recursive reads against public.profiles inside profiles policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_company_profiles(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles manager_profile
    WHERE manager_profile.id = auth.uid()
      AND manager_profile.company_id = target_company_id
      AND manager_profile.role IN ('admin', 'gerente')
      AND manager_profile.active IS DISTINCT FROM false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_company_profiles(UUID)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_company_profiles(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_self_update_profile(
  target_id UUID,
  target_company_id UUID,
  target_email TEXT,
  target_role TEXT,
  target_funcao TEXT,
  target_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles current_profile
    WHERE current_profile.id = auth.uid()
      AND current_profile.id = target_id
      AND current_profile.company_id IS NOT DISTINCT FROM target_company_id
      AND current_profile.email IS NOT DISTINCT FROM target_email
      AND current_profile.role IS NOT DISTINCT FROM target_role
      AND current_profile.funcao IS NOT DISTINCT FROM target_funcao
      AND current_profile.active IS NOT DISTINCT FROM target_active
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_self_update_profile(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_self_update_profile(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, funcao)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    public.normalize_profile_role(NEW.raw_user_meta_data ->> 'role'),
    public.normalize_profile_role(NEW.raw_user_meta_data ->> 'role')
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_manager() IS
  'Returns true if the currently authenticated user has admin or gerente role.';

-- ---------------------------------------------------------------------------
-- public.profiles RLS hardening
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS authenticated_pull_profiles ON public.profiles;
DROP POLICY IF EXISTS authenticated_update_own_profile ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_company_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_safe ON public.profiles;
DROP POLICY IF EXISTS profiles_update_company_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_company_admin ON public.profiles;

CREATE POLICY profiles_select_self_or_company_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.can_manage_company_profiles(company_id)
  );

CREATE POLICY profiles_update_self_safe
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    public.can_self_update_profile(id, company_id, email, role, funcao, active)
  );

CREATE POLICY profiles_update_company_admin
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id <> auth.uid()
    AND (
      public.can_manage_company_profiles(company_id)
      OR company_id IS NULL
    )
  )
  WITH CHECK (
    id <> auth.uid()
    AND public.can_manage_company_profiles(company_id)
  );

CREATE POLICY profiles_delete_company_admin
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    id <> auth.uid()
    AND public.can_manage_company_profiles(company_id)
  );
