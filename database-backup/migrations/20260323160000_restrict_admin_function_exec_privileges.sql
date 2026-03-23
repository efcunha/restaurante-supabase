-- =============================================================================
-- Migration: 20260323160000_restrict_admin_function_exec_privileges.sql
-- Description: Restrict execution of administrative/diagnostic functions to service_role
-- Rationale: Reduce attack surface from broad EXECUTE grants to anon/authenticated
-- Safety: Does NOT change RLS helper functions used by core app flows
-- =============================================================================

DO $$
BEGIN
  -- Dynamic SQL helper pattern via conditional existence checks to avoid breakage

  IF to_regprocedure('public.archive_old_partition(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.archive_old_partition(text) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.archive_old_partition(text) TO service_role';
  END IF;

  IF to_regprocedure('public.cleanup_old_partitions(integer,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cleanup_old_partitions(integer,boolean) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_old_partitions(integer,boolean) TO service_role';
  END IF;

  IF to_regprocedure('public.create_monthly_partition()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_monthly_partition() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_monthly_partition() TO service_role';
  END IF;

  IF to_regprocedure('public.create_partitions_for_range(date,date)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_partitions_for_range(date,date) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_partitions_for_range(date,date) TO service_role';
  END IF;

  IF to_regprocedure('public.drop_old_partition(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.drop_old_partition(text) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.drop_old_partition(text) TO service_role';
  END IF;

  IF to_regprocedure('public.execute_sql(text,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.execute_sql(text,jsonb) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.execute_sql(text,jsonb) TO service_role';
  END IF;

  IF to_regprocedure('public.get_autovacuum_config()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_autovacuum_config() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_autovacuum_config() TO service_role';
  END IF;

  IF to_regprocedure('public.get_autovacuum_stats()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_autovacuum_stats() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_autovacuum_stats() TO service_role';
  END IF;

  IF to_regprocedure('public.get_checkpoint_wal_config()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_checkpoint_wal_config() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_checkpoint_wal_config() TO service_role';
  END IF;

  IF to_regprocedure('public.get_partition_status()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_partition_status() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_partition_status() TO service_role';
  END IF;

  IF to_regprocedure('public.get_performance_config()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_performance_config() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_performance_config() TO service_role';
  END IF;

  IF to_regprocedure('public.get_tables_needing_vacuum()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_tables_needing_vacuum() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_tables_needing_vacuum() TO service_role';
  END IF;

  IF to_regprocedure('public.get_wal_stats()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_wal_stats() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_wal_stats() TO service_role';
  END IF;

  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role';
  END IF;

  IF to_regprocedure('public.run_scheduled_partition_maintenance()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.run_scheduled_partition_maintenance() FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.run_scheduled_partition_maintenance() TO service_role';
  END IF;
END $$;
