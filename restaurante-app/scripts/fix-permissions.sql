-- RESTORE SERVICE_ROLE PERMISSIONS
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Grant Usage on Schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT CREATE ON SCHEMA public TO service_role;

-- 2. Grant Access to All Tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 3. Ensure Future Tables are Accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- 4. Verify (Optional output)
DO $$
BEGIN
  RAISE NOTICE 'Permissions restored for service_role on public schema.';
END $$;
