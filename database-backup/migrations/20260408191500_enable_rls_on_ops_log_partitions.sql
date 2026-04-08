-- Enable RLS and mirror security policies for observability log partitions.
-- This keeps partition tables protected consistently with public.ops_logs.

ALTER TABLE IF EXISTS public.ops_logs_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ops_logs_2026_05 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ops_logs_2026_04'
      AND policyname = 'ops_authenticated_read_logs'
  ) THEN
    CREATE POLICY ops_authenticated_read_logs
      ON public.ops_logs_2026_04
      FOR SELECT
      TO public
      USING (auth.role() = ANY (ARRAY['service_role', 'authenticated']));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ops_logs_2026_04'
      AND policyname = 'ops_service_role_insert_logs'
  ) THEN
    CREATE POLICY ops_service_role_insert_logs
      ON public.ops_logs_2026_04
      FOR INSERT
      TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ops_logs_2026_05'
      AND policyname = 'ops_authenticated_read_logs'
  ) THEN
    CREATE POLICY ops_authenticated_read_logs
      ON public.ops_logs_2026_05
      FOR SELECT
      TO public
      USING (auth.role() = ANY (ARRAY['service_role', 'authenticated']));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ops_logs_2026_05'
      AND policyname = 'ops_service_role_insert_logs'
  ) THEN
    CREATE POLICY ops_service_role_insert_logs
      ON public.ops_logs_2026_05
      FOR INSERT
      TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;
