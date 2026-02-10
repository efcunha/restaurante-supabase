--
-- PostgreSQL database dump
--

\restrict fSdbMsn9vpcz5bfz4Ws0Olu2RUxkgAOA1MKW23ZidiTC6RxaytEb9EoCAOJWB5b

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: archive_old_partition(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.archive_old_partition(partition_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    archive_table_name TEXT;
BEGIN
    archive_table_name := partition_name || '_archive';
    
    -- Create archive table if it doesn't exist
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I (LIKE %I INCLUDING ALL)',
        archive_table_name, partition_name
    );
    
    -- Copy data to archive table
    EXECUTE format(
        'INSERT INTO %I SELECT * FROM %I ON CONFLICT DO NOTHING',
        archive_table_name, partition_name
    );
    
    -- Detach partition from parent table
    EXECUTE format(
        'ALTER TABLE orders DETACH PARTITION %I',
        partition_name
    );
    
    -- Drop the original partition
    EXECUTE format('DROP TABLE %I', partition_name);
    
    RAISE NOTICE 'Archived partition % to %', partition_name, archive_table_name;
END;
$$;


ALTER FUNCTION public.archive_old_partition(partition_name text) OWNER TO postgres;

--
-- Name: FUNCTION archive_old_partition(partition_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.archive_old_partition(partition_name text) IS 'Archives a partition to a separate archive table and detaches it from the parent';


--
-- Name: cleanup_old_partitions(integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_partitions(retention_months integer DEFAULT 12, archive_mode boolean DEFAULT true) RETURNS TABLE(partition_name text, action text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
    partition_date DATE;
BEGIN
    -- Calculate cutoff date
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
    
    RAISE NOTICE 'Cleaning up partitions older than %', cutoff_date;
    
    -- Find all partitions older than retention period
    FOR partition_record IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'orders_%'
        AND tablename NOT LIKE '%_archive'
        AND tablename != 'orders_partitioned'
    LOOP
        -- Extract date from partition name (format: orders_YYYY_MM)
        BEGIN
            partition_date := TO_DATE(
                SUBSTRING(partition_record.tablename FROM 'orders_(\d{4}_\d{2})'),
                'YYYY_MM'
            );
            
            -- Check if partition is older than retention period
            IF partition_date < cutoff_date THEN
                IF archive_mode THEN
                    -- Archive the partition
                    PERFORM archive_old_partition(partition_record.tablename);
                    partition_name := partition_record.tablename;
                    action := 'archived';
                    RETURN NEXT;
                ELSE
                    -- Drop the partition
                    PERFORM drop_old_partition(partition_record.tablename);
                    partition_name := partition_record.tablename;
                    action := 'dropped';
                    RETURN NEXT;
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Skipping invalid partition name: %', partition_record.tablename;
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION public.cleanup_old_partitions(retention_months integer, archive_mode boolean) OWNER TO postgres;

--
-- Name: FUNCTION cleanup_old_partitions(retention_months integer, archive_mode boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cleanup_old_partitions(retention_months integer, archive_mode boolean) IS 'Automatically cleans up partitions older than retention period';


--
-- Name: close_cash_register(uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
    v_result jsonb;
    v_register record;
    v_difference numeric;
begin
    -- Get register details
    select * into v_register
    from public.cash_registers
    where id = p_register_id
    and status = 'open';
    
    if not found then
        return jsonb_build_object(
            'success', false,
            'error', 'Cash register not found or already closed'
        );
    end if;
    
    -- Calculate difference
    v_difference := p_final_amount - v_register.initial_amount;
    
    -- Close the register
    update public.cash_registers
    set 
        status = 'closed',
        closed_at = now(),
        closed_by = p_closed_by,
        final_amount = p_final_amount,
        difference = v_difference,
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where id = p_register_id;
    
    return jsonb_build_object(
        'success', true,
        'register_id', p_register_id,
        'initial_amount', v_register.initial_amount,
        'final_amount', p_final_amount,
        'difference', v_difference
    );
end;
$$;


ALTER FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text) OWNER TO postgres;

--
-- Name: close_cash_register(uuid, uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_register record;
    v_difference numeric;
BEGIN
    -- Get register
    SELECT * INTO v_register
    FROM public.cash_registers
    WHERE id = p_register_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cash register not found');
    END IF;
    
    IF v_register.status != 'aberto' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cash register is not open');
    END IF;
    
    -- Calculate difference
    v_difference := p_actual_balance - v_register.expected_balance;
    
    -- Close register
    UPDATE public.cash_registers
    SET 
        status = 'fechado',
        closed_at = NOW(),
        closed_by = p_closed_by,
        closed_by_name = p_closed_by_name,
        actual_balance = p_actual_balance,
        difference = v_difference
    WHERE id = p_register_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'difference', v_difference
    );
END;
$$;


ALTER FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) OWNER TO postgres;

--
-- Name: FUNCTION close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) IS 'Closes an open cash register and calculates difference.
Security: Uses caller privileges (SECURITY INVOKER).
RLS policies on cash_registers table enforce company-level access control.';


--
-- Name: close_comanda(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
    v_result jsonb;
    v_comanda record;
begin
    -- Get comanda details
    select * into v_comanda
    from public.comandas
    where id = p_comanda_id
    and status = 'aberta';
    
    if not found then
        return jsonb_build_object(
            'success', false,
            'error', 'Comanda not found or already closed'
        );
    end if;
    
    -- Close the comanda
    update public.comandas
    set 
        status = 'fechada',
        closed_at = now(),
        closed_by = p_closed_by,
        total_consumed = p_total_amount,
        updated_at = now()
    where id = p_comanda_id;
    
    return jsonb_build_object(
        'success', true,
        'comanda_id', p_comanda_id,
        'comanda_number', v_comanda.comanda_number
    );
end;
$$;


ALTER FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric) OWNER TO postgres;

--
-- Name: close_comanda(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_comanda record;
BEGIN
    -- Get comanda
    SELECT * INTO v_comanda
    FROM public.comandas
    WHERE id = p_comanda_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comanda not found');
    END IF;
    
    IF v_comanda.status != 'aberta' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comanda is not open');
    END IF;
    
    -- Close comanda
    UPDATE public.comandas
    SET 
        status = 'fechada',
        closed_at = NOW(),
        closed_by = p_closed_by,
        closed_by_name = p_closed_by_name
    WHERE id = p_comanda_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) OWNER TO postgres;

--
-- Name: FUNCTION close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) IS 'Closes an open comanda.
Security: Uses caller privileges (SECURITY INVOKER).
RLS policies on comandas table enforce company-level access control.';


--
-- Name: create_monthly_partition(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_monthly_partition() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    -- Calculate next month's partition
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'orders_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := partition_date::TEXT;
    end_date := (partition_date + INTERVAL '1 month')::TEXT;
    
    -- Create partition if it doesn't exist
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders_partitioned FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created partition % for date range % to %', partition_name, start_date, end_date;
END;
$$;


ALTER FUNCTION public.create_monthly_partition() OWNER TO postgres;

--
-- Name: FUNCTION create_monthly_partition(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_monthly_partition() IS 'Creates a partition for the next month automatically';


--
-- Name: create_partitions_for_range(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_partitions_for_range(start_month date, end_month date) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_month DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    current_month := DATE_TRUNC('month', start_month);
    
    WHILE current_month <= end_month LOOP
        partition_name := 'orders_' || TO_CHAR(current_month, 'YYYY_MM');
        start_date := current_month::TEXT;
        end_date := (current_month + INTERVAL '1 month')::TEXT;
        
        -- Create partition if it doesn't exist
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        RAISE NOTICE 'Created partition % for date range % to %', partition_name, start_date, end_date;
        
        current_month := current_month + INTERVAL '1 month';
    END LOOP;
END;
$$;


ALTER FUNCTION public.create_partitions_for_range(start_month date, end_month date) OWNER TO postgres;

--
-- Name: FUNCTION create_partitions_for_range(start_month date, end_month date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_partitions_for_range(start_month date, end_month date) IS 'Creates partitions for a specified date range';


--
-- Name: drop_old_partition(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.drop_old_partition(partition_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Detach partition from parent table
    EXECUTE format(
        'ALTER TABLE orders DETACH PARTITION %I',
        partition_name
    );
    
    -- Drop the partition
    EXECUTE format('DROP TABLE %I', partition_name);
    
    RAISE NOTICE 'Dropped partition %', partition_name;
END;
$$;


ALTER FUNCTION public.drop_old_partition(partition_name text) OWNER TO postgres;

--
-- Name: FUNCTION drop_old_partition(partition_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.drop_old_partition(partition_name text) IS 'Drops a partition without archiving';


--
-- Name: execute_sql(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.execute_sql(query text, params jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE result JSONB;
BEGIN EXECUTE query INTO result;
RETURN result;
EXCEPTION
WHEN OTHERS THEN RAISE;
END;
$$;


ALTER FUNCTION public.execute_sql(query text, params jsonb) OWNER TO postgres;

--
-- Name: get_autovacuum_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_autovacuum_config() RETURNS TABLE(setting_name text, current_value text, unit text, description text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name::TEXT,
    s.setting::TEXT,
    COALESCE(s.unit, '')::TEXT,
    s.short_desc::TEXT
  FROM pg_settings s
  WHERE s.name LIKE 'autovacuum%' OR s.name LIKE 'vacuum%'
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION public.get_autovacuum_config() OWNER TO postgres;

--
-- Name: get_autovacuum_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_autovacuum_stats() RETURNS TABLE(schemaname text, tablename text, last_vacuum timestamp with time zone, last_autovacuum timestamp with time zone, last_analyze timestamp with time zone, last_autoanalyze timestamp with time zone, vacuum_count bigint, autovacuum_count bigint, analyze_count bigint, autoanalyze_count bigint, n_tup_ins bigint, n_tup_upd bigint, n_tup_del bigint, n_live_tup bigint, n_dead_tup bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.relname::TEXT,
    s.last_vacuum,
    s.last_autovacuum,
    s.last_analyze,
    s.last_autoanalyze,
    s.vacuum_count,
    s.autovacuum_count,
    s.analyze_count,
    s.autoanalyze_count,
    s.n_tup_ins,
    s.n_tup_upd,
    s.n_tup_del,
    s.n_live_tup,
    s.n_dead_tup
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public'
  ORDER BY s.n_dead_tup DESC, s.relname;
END;
$$;


ALTER FUNCTION public.get_autovacuum_stats() OWNER TO postgres;

--
-- Name: get_checkpoint_wal_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_checkpoint_wal_config() RETURNS TABLE(setting_name text, current_value text, unit text, description text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name::TEXT,
    s.setting::TEXT,
    COALESCE(s.unit, '')::TEXT,
    s.short_desc::TEXT
  FROM pg_settings s
  WHERE s.name IN (
    'checkpoint_completion_target',
    'checkpoint_timeout',
    'wal_buffers',
    'max_wal_size',
    'min_wal_size',
    'wal_compression',
    'wal_writer_delay'
  )
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION public.get_checkpoint_wal_config() OWNER TO postgres;

--
-- Name: get_my_company_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_company_id() RETURNS uuid
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;


ALTER FUNCTION public.get_my_company_id() OWNER TO postgres;

--
-- Name: FUNCTION get_my_company_id(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_my_company_id() IS 'Returns the company_id for the currently authenticated user.
Performance optimizations:
- STABLE: Result is consistent within a transaction
- PARALLEL SAFE: Can be used in parallel query execution
- SECURITY INVOKER (default): Runs with caller privileges, not definer
- Uses indexed lookup on profiles.id (primary key)

Usage: Used in RLS policies to filter data by company_id.
Note: Returns NULL if user has no profile or is not authenticated.';


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION public.get_my_role() OWNER TO postgres;

--
-- Name: get_next_comanda_number(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE plpgsql STABLE PARALLEL SAFE
    AS $$
DECLARE
    v_next_number int;
BEGIN
    -- Get the max comanda number for this company and date
    SELECT COALESCE(MAX(comanda_number), 0) + 1
    INTO v_next_number
    FROM public.comandas
    WHERE company_id = p_company_id
    AND date_key = p_date_key;
    
    RETURN v_next_number;
END;
$$;


ALTER FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date) OWNER TO postgres;

--
-- Name: FUNCTION get_next_comanda_number(p_company_id uuid, p_date_key date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date) IS 'Generates next sequential comanda number for a company on a given date.
Performance optimizations:
- STABLE: Result is consistent within a transaction
- PARALLEL SAFE: Can be used in parallel query execution
- Uses indexed lookup on comandas(company_id, date_key)

Note: This function is not IMMUTABLE because it depends on table data.';


--
-- Name: get_next_comanda_number(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
    v_next_number int;
    v_date_key date;
begin
    -- Converter string para date
    if p_date_key is null or p_date_key = '' then
        v_date_key := current_date;
    else
        v_date_key := p_date_key::date;
    end if;
    
    -- Buscar próximo número (agora comanda_number é INT)
    select coalesce(max(comanda_number), 0) + 1
    into v_next_number
    from public.comandas
    where company_id = p_company_id
    and date_key = v_date_key;
    
    return v_next_number;
end;
$$;


ALTER FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key text) OWNER TO postgres;

--
-- Name: get_partition_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_partition_status() RETURNS TABLE(partition_name text, partition_date date, row_count bigint, size_bytes bigint, age_months integer, should_cleanup boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    retention_months INTEGER := 12;
    cutoff_date DATE;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
    
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        TO_DATE(SUBSTRING(t.tablename FROM 'orders_(\d{4}_\d{2})'), 'YYYY_MM') as partition_date,
        (SELECT COUNT(*) FROM pg_class WHERE relname = t.tablename)::BIGINT as row_count,
        pg_total_relation_size(t.tablename::regclass)::BIGINT as size_bytes,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(t.tablename FROM 'orders_(\d{4}_\d{2})'), 'YYYY_MM')))::INTEGER * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(t.tablename FROM 'orders_(\d{4}_\d{2})'), 'YYYY_MM')))::INTEGER as age_months,
        TO_DATE(SUBSTRING(t.tablename FROM 'orders_(\d{4}_\d{2})'), 'YYYY_MM') < cutoff_date as should_cleanup
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename LIKE 'orders_%'
    AND t.tablename NOT LIKE '%_archive'
    AND t.tablename != 'orders_partitioned'
    ORDER BY partition_date DESC;
END;
$$;


ALTER FUNCTION public.get_partition_status() OWNER TO postgres;

--
-- Name: FUNCTION get_partition_status(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_partition_status() IS 'Returns status information for all partitions including age and cleanup recommendations';


--
-- Name: get_performance_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_performance_config() RETURNS TABLE(setting_name text, current_value text, unit text, category text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name::TEXT,
    s.setting::TEXT,
    COALESCE(s.unit, '')::TEXT,
    CASE 
      WHEN s.name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'maintenance_work_mem') 
        THEN 'Memory'
      WHEN s.name IN ('jit', 'random_page_cost', 'effective_io_concurrency') 
        THEN 'Query Planning'
      WHEN s.name IN ('max_connections', 'statement_timeout', 'idle_in_transaction_session_timeout') 
        THEN 'Connections'
      ELSE 'Other'
    END::TEXT
  FROM pg_settings s
  WHERE s.name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'jit',
    'random_page_cost',
    'effective_io_concurrency',
    'max_connections',
    'statement_timeout',
    'idle_in_transaction_session_timeout'
  )
  ORDER BY 4, 1;
END;
$$;


ALTER FUNCTION public.get_performance_config() OWNER TO postgres;

--
-- Name: get_tables_needing_vacuum(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_tables_needing_vacuum() RETURNS TABLE(schemaname text, tablename text, n_dead_tup bigint, n_live_tup bigint, dead_tuple_percent numeric, last_autovacuum timestamp with time zone, recommendation text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.relname::TEXT,
    s.n_dead_tup,
    s.n_live_tup,
    CASE 
      WHEN s.n_live_tup > 0 
      THEN ROUND((s.n_dead_tup::NUMERIC / s.n_live_tup::NUMERIC) * 100, 2)
      ELSE 0
    END AS dead_tuple_percent,
    s.last_autovacuum,
    CASE
      WHEN s.n_dead_tup > 10000 AND s.n_live_tup > 0 AND 
           (s.n_dead_tup::NUMERIC / s.n_live_tup::NUMERIC) > 0.1
      THEN 'Alta prioridade - Considere VACUUM manual'
      WHEN s.n_dead_tup > 5000 AND s.n_live_tup > 0 AND 
           (s.n_dead_tup::NUMERIC / s.n_live_tup::NUMERIC) > 0.05
      THEN 'Média prioridade - Monitore o auto-vacuum'
      WHEN s.n_dead_tup > 1000
      THEN 'Baixa prioridade - Auto-vacuum normal vai resolver'
      ELSE 'Nenhuma ação necessária'
    END::TEXT AS recommendation
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public' AND s.n_dead_tup > 0
  ORDER BY dead_tuple_percent DESC, s.n_dead_tup DESC;
END;
$$;


ALTER FUNCTION public.get_tables_needing_vacuum() OWNER TO postgres;

--
-- Name: get_wal_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_wal_stats() RETURNS TABLE(wal_records bigint, wal_fpi bigint, wal_bytes numeric, wal_buffers_full bigint, stats_reset timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_wal.wal_records,
    pg_stat_wal.wal_fpi,
    pg_stat_wal.wal_bytes,
    pg_stat_wal.wal_buffers_full,
    pg_stat_wal.stats_reset
  FROM pg_stat_wal;
END;
$$;


ALTER FUNCTION public.get_wal_stats() OWNER TO postgres;

--
-- Name: handle_new_company_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_company_config() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.app_configurations (company_id, key, value, updated_at)
  VALUES
    (NEW.id, 'temperos_caldos', '["Cebolinha e Coentro", "Cebolinha", "Sem Nada"]'::jsonb, NOW()),
    (NEW.id, 'temperos_comidas', '["Cebolinha e Coentro", "Cebolinha", "Sem Nada"]'::jsonb, NOW()),
    (NEW.id, 'variacoes_espetinho', '["Simples", "com Arroz", "com Macaxeira", "Completo"]'::jsonb, NOW()),
    (NEW.id, 'pizza_sizes', '[
      { "name": "Fatia", "maxFlavors": 1 },
      { "name": "Broto", "maxFlavors": 1 },
      { "name": "Média", "maxFlavors": 2 },
      { "name": "Grande/Família", "maxFlavors": 4 }
    ]'::jsonb, NOW()),
    (NEW.id, 'product_categories', '[
      { "value": "caldo", "label": "🍲 Caldos" },
      { "value": "espetinho-simples", "label": "🔥 Espetinho Simples" },
      { "value": "espetinho-especial", "label": "🌟 Espetinho Especial" },
      { "value": "porcao", "label": "🍟 Porção" },
      { "value": "bebida", "label": "🥤 Bebida" },
      { "value": "comida", "label": "🍽️ Comida" },
      { "value": "pizza", "label": "🍕 Pizza" },
      { "value": "outro", "label": "📦 Outro" }
    ]'::jsonb, NOW()),
    (NEW.id, 'category_order', '{
      "espetinho-simples": 1,
      "espetinho-especial": 2,
      "caldo": 3,
      "porcao": 4,
      "bebida": 5,
      "comida": 6,
      "outro": 7
    }'::jsonb, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_company_config() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'garcom');  -- Role padrão
    return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin_or_manager(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin_or_manager() RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$;


ALTER FUNCTION public.is_admin_or_manager() OWNER TO postgres;

--
-- Name: FUNCTION is_admin_or_manager(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_admin_or_manager() IS 'Returns true if the currently authenticated user has admin or manager role.
Performance optimizations:
- STABLE: Result is consistent within a transaction
- PARALLEL SAFE: Can be used in parallel query execution
- Uses indexed lookup on profiles.id (primary key)
- Avoids nested subqueries in RLS policies

Usage: Used in RLS policies to restrict operations to admins/managers.';


--
-- Name: registrar_pagamento_comanda(uuid, uuid, text, text, numeric, text, uuid, text, numeric, numeric, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Insert into pagamentos
  INSERT INTO public.pagamentos (
    company_id,
    comanda_number,
    date_key,
    amount,
    payment_method,
    received_by,
    received_by_name,
    created_at
  ) VALUES (
    p_company_id,
    p_comanda_number,
    p_date_key,
    p_valor,
    p_forma,
    p_usuario_id,
    p_usuario_nome,
    NOW()
  ) RETURNING id INTO v_payment_id;

  -- Update comandas
  UPDATE public.comandas
  SET
    total_paid = p_total_pago,
    open_balance = p_saldo_aberto,
    pagamentos_resumo = p_pagamentos_resumo,
    ultimo_pagamento_por = p_usuario_nome,
    ultimo_pagamento_forma = p_forma,
    ultimo_pagamento_em = NOW(),
    updated_at = NOW(),
    received_by = array_append(COALESCE(received_by, '{}'), p_usuario_id)
  WHERE
    company_id = p_company_id AND
    id = p_comanda_id;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;


ALTER FUNCTION public.registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text) OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: run_scheduled_partition_maintenance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.run_scheduled_partition_maintenance() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    config RECORD;
BEGIN
    -- Get configuration
    SELECT * INTO config FROM public.partition_maintenance_config LIMIT 1;
    
    IF config.auto_cleanup_enabled THEN
        -- Run cleanup
        PERFORM cleanup_old_partitions(config.retention_months, config.archive_mode);
        
        -- Update last cleanup timestamp
        UPDATE public.partition_maintenance_config
        SET last_cleanup_at = NOW(),
            updated_at = NOW()
        WHERE id = config.id;
        
        RAISE NOTICE 'Scheduled partition maintenance completed';
    ELSE
        RAISE NOTICE 'Auto cleanup is disabled';
    END IF;
END;
$$;


ALTER FUNCTION public.run_scheduled_partition_maintenance() OWNER TO postgres;

--
-- Name: FUNCTION run_scheduled_partition_maintenance(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.run_scheduled_partition_maintenance() IS 'Runs partition maintenance based on configuration table settings';


--
-- Name: should_partition_orders(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.should_partition_orders() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    row_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO row_count FROM public.orders;
    RETURN row_count > 100000;
END;
$$;


ALTER FUNCTION public.should_partition_orders() OWNER TO postgres;

--
-- Name: FUNCTION should_partition_orders(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.should_partition_orders() IS 'Checks if orders table has more than 100,000 rows and needs partitioning';


--
-- Name: update_companies_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_companies_updated_at() OWNER TO postgres;

--
-- Name: update_pizza_extras_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_pizza_extras_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_pizza_extras_updated_at() OWNER TO postgres;

--
-- Name: update_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_settings_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: user_in_company(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_in_company(target_company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND company_id = target_company_id
  );
$$;


ALTER FUNCTION public.user_in_company(target_company_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION user_in_company(target_company_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.user_in_company(target_company_id uuid) IS 'Returns true if the currently authenticated user belongs to the specified company.
Performance optimizations:
- STABLE: Result is consistent within a transaction
- PARALLEL SAFE: Can be used in parallel query execution
- Uses indexed lookup on profiles.id and profiles.company_id

Usage: Used in RLS policies to verify company membership.
Example: user_in_company(orders.company_id)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.app_configurations OWNER TO postgres;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    company_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    user_id uuid,
    event_type text NOT NULL,
    resource_type text,
    resource_id text,
    old_data jsonb,
    new_data jsonb,
    severity text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_movements (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    cash_register_id uuid,
    type text,
    value numeric(10,2) NOT NULL,
    reason text,
    user_id uuid,
    user_name text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cash_movements_type_check CHECK ((type = ANY (ARRAY['reforco'::text, 'sangria'::text])))
);


ALTER TABLE public.cash_movements OWNER TO postgres;

--
-- Name: cash_registers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_registers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    date_key date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'aberto'::text,
    initial_value numeric(10,2) DEFAULT 0,
    opened_by uuid,
    opened_by_name text,
    opened_at timestamp with time zone DEFAULT now(),
    total_sales numeric(10,2) DEFAULT 0,
    sales_by_method jsonb DEFAULT '{"pix": 0, "debito": 0, "credito": 0, "dinheiro": 0}'::jsonb,
    total_reinforcements numeric(10,2) DEFAULT 0,
    total_bleedings numeric(10,2) DEFAULT 0,
    expected_balance numeric(10,2) DEFAULT 0,
    real_balance numeric(10,2) DEFAULT 0,
    difference numeric(10,2) DEFAULT 0,
    closed_at timestamp with time zone,
    closed_by uuid,
    closed_by_name text,
    movements_count integer DEFAULT 0,
    ticket_avg numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cash_registers_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'fechado'::text])))
);


ALTER TABLE public.cash_registers OWNER TO postgres;

--
-- Name: comandas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comandas (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    date_key date DEFAULT CURRENT_DATE NOT NULL,
    comanda_number integer NOT NULL,
    status text DEFAULT 'aberta'::text,
    table_number text,
    client_name text,
    total_consumed numeric(10,2) DEFAULT 0,
    total_paid numeric(10,2) DEFAULT 0,
    open_balance numeric(10,2) DEFAULT 0,
    received_by jsonb DEFAULT '[]'::jsonb,
    opened_at timestamp with time zone DEFAULT now(),
    opened_by uuid,
    opened_by_name text,
    closed_at timestamp with time zone,
    closed_by uuid,
    closed_by_name text,
    canceled_at timestamp with time zone,
    canceled_by uuid,
    canceled_by_name text,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pagamentos_resumo jsonb DEFAULT '{}'::jsonb,
    ultimo_pagamento_por text,
    ultimo_pagamento_forma text,
    ultimo_pagamento_em timestamp with time zone,
    mesa text,
    cliente text,
    motivo_cancelamento text,
    CONSTRAINT comandas_status_check CHECK ((status = ANY (ARRAY['aberta'::text, 'fechada'::text, 'cancelada'::text, 'paga'::text])))
)
WITH (autovacuum_vacuum_scale_factor='0.1', autovacuum_analyze_scale_factor='0.05', autovacuum_vacuum_cost_limit='300');


ALTER TABLE public.comandas OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    cnpj text,
    created_at timestamp with time zone DEFAULT now(),
    plan text DEFAULT 'free'::text,
    active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    document_type text DEFAULT 'cnpj'::text,
    document text,
    contact_name text,
    contact_phone text,
    address text,
    city text,
    state text,
    zip_code text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT companies_document_type_check CHECK ((document_type = ANY (ARRAY['cpf'::text, 'cnpj'::text])))
)
WITH (autovacuum_vacuum_scale_factor='0.2', autovacuum_analyze_scale_factor='0.1', autovacuum_vacuum_cost_limit='200');


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: daily_statistics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_statistics (
    company_id uuid NOT NULL,
    date_key date NOT NULL,
    total_orders integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    orders_by_status jsonb DEFAULT '{}'::jsonb,
    top_items jsonb DEFAULT '[]'::jsonb,
    last_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public.daily_statistics OWNER TO postgres;

--
-- Name: environments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    section_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.environments OWNER TO postgres;

--
-- Name: estoque; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estoque (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    nome text NOT NULL,
    quantidade double precision DEFAULT 0,
    unidade text DEFAULT 'un'::text,
    preco_custo double precision DEFAULT 0,
    quantidade_minima double precision DEFAULT 0,
    fornecedor_id uuid,
    fornecedor_nome text,
    observacoes text,
    categoria text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.estoque OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    unit text,
    quantity numeric DEFAULT 0,
    min_quantity numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: order_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    company_id uuid NOT NULL,
    from_table_id uuid,
    to_table_id uuid,
    from_waiter_id uuid,
    to_waiter_id uuid,
    transferred_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.order_transfers OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    comanda_number integer,
    table_number integer,
    client_name text,
    observations text,
    status text DEFAULT 'pending'::text,
    total_amount numeric(10,2) DEFAULT 0,
    items jsonb DEFAULT '[]'::jsonb,
    is_paid boolean DEFAULT false,
    payment_method text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_key date DEFAULT CURRENT_DATE,
    cancelado_em timestamp with time zone,
    cancelado_por text,
    comanda_status text,
    items_with_status jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])))
)
WITH (autovacuum_vacuum_scale_factor='0.05', autovacuum_analyze_scale_factor='0.02', autovacuum_vacuum_cost_limit='400');


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagamentos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    comanda_number text NOT NULL,
    date_key date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text,
    received_by uuid,
    received_by_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
)
WITH (autovacuum_vacuum_scale_factor='0.1', autovacuum_analyze_scale_factor='0.05', autovacuum_vacuum_cost_limit='300');


ALTER TABLE public.pagamentos OWNER TO postgres;

--
-- Name: partition_maintenance_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partition_maintenance_config (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    retention_months integer DEFAULT 12 NOT NULL,
    archive_mode boolean DEFAULT true NOT NULL,
    auto_cleanup_enabled boolean DEFAULT false NOT NULL,
    last_cleanup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.partition_maintenance_config OWNER TO postgres;

--
-- Name: TABLE partition_maintenance_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.partition_maintenance_config IS 'Configuration for automatic partition maintenance';


--
-- Name: pizza_extras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pizza_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pizza_extras_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT pizza_extras_type_check CHECK ((type = ANY (ARRAY['borda'::text, 'adicional'::text])))
);


ALTER TABLE public.pizza_extras OWNER TO postgres;

--
-- Name: TABLE pizza_extras; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pizza_extras IS 'Stores configurable extras and borders for pizzas (borda recheada and adicionais)';


--
-- Name: COLUMN pizza_extras.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pizza_extras.type IS 'Type of extra: borda (stuffed crust) or adicional (additional topping)';


--
-- Name: COLUMN pizza_extras.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pizza_extras.name IS 'Name of the extra (e.g., Catupiry, Cheddar, Bacon)';


--
-- Name: COLUMN pizza_extras.price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pizza_extras.price IS 'Price for this extra in the local currency';


--
-- Name: COLUMN pizza_extras.active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pizza_extras.active IS 'Whether this extra is currently available for selection';


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category text,
    image_url text,
    active boolean DEFAULT true,
    available boolean DEFAULT true,
    inventory_control boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    prices jsonb DEFAULT '{}'::jsonb,
    ingredients text[] DEFAULT '{}'::text[],
    custom_ingredients text,
    inventory_items jsonb DEFAULT '[]'::jsonb,
    subcategory text,
    CONSTRAINT check_pizza_subcategory CHECK (((category <> 'pizza'::text) OR (subcategory IS NULL) OR (subcategory = ANY (ARRAY['Tradicional'::text, 'Especiais'::text, 'Doces'::text]))))
)
WITH (autovacuum_vacuum_scale_factor='0.2', autovacuum_analyze_scale_factor='0.1', autovacuum_vacuum_cost_limit='200');


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: COLUMN products.prices; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.prices IS 'JSON object with pizza sizes and prices: {"Broto": 29.90, "Média": 39.90, "Grande": 49.90}';


--
-- Name: COLUMN products.ingredients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.ingredients IS 'Array of ingredient names for the pizza';


--
-- Name: COLUMN products.subcategory; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.subcategory IS 'Pizza subcategory: Tradicional, Especiais, or Doces';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    company_id uuid,
    email text,
    full_name text,
    role text DEFAULT 'waiter'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cpf text,
    phone text,
    funcao text,
    active boolean DEFAULT true,
    hire_date date,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'waiter'::text, 'kitchen'::text])))
)
WITH (autovacuum_vacuum_scale_factor='0.2', autovacuum_analyze_scale_factor='0.1', autovacuum_vacuum_cost_limit='200');


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: query_performance_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.query_performance_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text,
    execution_time double precision,
    rows_scanned integer,
    rows_returned integer,
    indexes_used text[],
    execution_plan jsonb,
    "timestamp" timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid,
    user_id uuid
);


ALTER TABLE public.query_performance_logs OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    nome text NOT NULL,
    cnpj text,
    contato text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    environment_id uuid,
    number text NOT NULL,
    seats integer DEFAULT 4,
    position_x double precision DEFAULT 0,
    position_y double precision DEFAULT 0,
    shape text DEFAULT 'square'::text,
    width double precision DEFAULT 80,
    height double precision DEFAULT 80,
    rotation double precision DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.tables OWNER TO postgres;

--
-- Name: app_configurations app_configurations_company_id_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configurations
    ADD CONSTRAINT app_configurations_company_id_key_key UNIQUE (company_id, key);


--
-- Name: app_configurations app_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configurations
    ADD CONSTRAINT app_configurations_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (company_id, key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: cash_registers cash_registers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_pkey PRIMARY KEY (id);


--
-- Name: comandas comandas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: daily_statistics daily_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_statistics
    ADD CONSTRAINT daily_statistics_pkey PRIMARY KEY (company_id, date_key);


--
-- Name: environments environments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_pkey PRIMARY KEY (id);


--
-- Name: estoque estoque_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: order_transfers order_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pagamentos pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);


--
-- Name: partition_maintenance_config partition_maintenance_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partition_maintenance_config
    ADD CONSTRAINT partition_maintenance_config_pkey PRIMARY KEY (id);


--
-- Name: pizza_extras pizza_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pizza_extras
    ADD CONSTRAINT pizza_extras_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: query_performance_logs query_performance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.query_performance_logs
    ADD CONSTRAINT query_performance_logs_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tables tables_company_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_company_id_number_key UNIQUE (company_id, number);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: products unique_product_per_company; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT unique_product_per_company UNIQUE (company_id, name, category);


--
-- Name: idx_audit_company_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_company_date ON public.audit_logs USING btree (company_id, created_at DESC);


--
-- Name: idx_audit_logs_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_company ON public.audit_logs USING btree (company_id);


--
-- Name: idx_cash_movements_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_movements_company ON public.cash_movements USING btree (company_id);


--
-- Name: idx_cash_movements_register; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_movements_register ON public.cash_movements USING btree (cash_register_id);


--
-- Name: idx_cash_registers_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_registers_company ON public.cash_registers USING btree (company_id);


--
-- Name: idx_cash_registers_company_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_registers_company_date ON public.cash_registers USING btree (company_id, date_key);


--
-- Name: idx_comandas_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comandas_company ON public.comandas USING btree (company_id);


--
-- Name: idx_comandas_company_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comandas_company_date ON public.comandas USING btree (company_id, date_key);


--
-- Name: idx_comandas_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comandas_number ON public.comandas USING btree (company_id, date_key, comanda_number);


--
-- Name: idx_comandas_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comandas_status ON public.comandas USING btree (company_id, status);


--
-- Name: idx_companies_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_document ON public.companies USING btree (document);


--
-- Name: idx_daily_stats_orders_by_status_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_stats_orders_by_status_gin ON public.daily_statistics USING gin (orders_by_status);


--
-- Name: idx_daily_stats_top_items_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_stats_top_items_gin ON public.daily_statistics USING gin (top_items);


--
-- Name: idx_environments_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_environments_company ON public.environments USING btree (company_id);


--
-- Name: idx_order_transfers_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_transfers_company ON public.order_transfers USING btree (company_id);


--
-- Name: idx_order_transfers_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_transfers_created_at ON public.order_transfers USING btree (created_at);


--
-- Name: idx_order_transfers_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_transfers_order ON public.order_transfers USING btree (order_id);


--
-- Name: idx_orders_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_active ON public.orders USING btree (company_id, created_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'preparing'::text]));


--
-- Name: idx_orders_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company ON public.orders USING btree (company_id);


--
-- Name: idx_orders_company_comanda; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company_comanda ON public.orders USING btree (company_id, comanda_number, date_key);


--
-- Name: idx_orders_company_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company_date ON public.orders USING btree (company_id, date_key);


--
-- Name: idx_orders_company_date_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company_date_created_at ON public.orders USING btree (company_id, date_key, created_at DESC);


--
-- Name: idx_orders_company_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company_status ON public.orders USING btree (company_id, status);


--
-- Name: idx_orders_items_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_items_gin ON public.orders USING gin (items);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (company_id, status);


--
-- Name: idx_orders_unpaid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_unpaid ON public.orders USING btree (company_id, comanda_number) WHERE (is_paid = false);


--
-- Name: idx_pagamentos_comanda_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagamentos_comanda_number ON public.pagamentos USING btree (comanda_number);


--
-- Name: idx_pagamentos_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagamentos_company ON public.pagamentos USING btree (company_id);


--
-- Name: idx_pagamentos_company_comanda_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagamentos_company_comanda_date ON public.pagamentos USING btree (company_id, comanda_number, date_key);


--
-- Name: idx_pagamentos_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagamentos_company_id ON public.pagamentos USING btree (company_id);


--
-- Name: idx_pagamentos_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagamentos_date_key ON public.pagamentos USING btree (date_key);


--
-- Name: idx_pizza_extras_company_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pizza_extras_company_active ON public.pizza_extras USING btree (company_id, active);


--
-- Name: idx_pizza_extras_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pizza_extras_company_id ON public.pizza_extras USING btree (company_id);


--
-- Name: idx_pizza_extras_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pizza_extras_type ON public.pizza_extras USING btree (type);


--
-- Name: idx_products_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_available ON public.products USING btree (available);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_category_subcategory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_subcategory ON public.products USING btree (category, subcategory);


--
-- Name: idx_products_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_company ON public.products USING btree (company_id);


--
-- Name: idx_products_company_category_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_company_category_name ON public.products USING btree (company_id, category, name);


--
-- Name: idx_products_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_company_id ON public.products USING btree (company_id);


--
-- Name: idx_products_subcategory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_subcategory ON public.products USING btree (subcategory);


--
-- Name: idx_profiles_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_active ON public.profiles USING btree (active);


--
-- Name: idx_profiles_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_company ON public.profiles USING btree (company_id);


--
-- Name: idx_profiles_company_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_company_role ON public.profiles USING btree (company_id, role);


--
-- Name: INDEX idx_profiles_company_role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_profiles_company_role IS 'Composite index for company-scoped role queries. Used when filtering profiles by company and role.';


--
-- Name: idx_profiles_cpf; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_cpf ON public.profiles USING btree (cpf);


--
-- Name: idx_profiles_id_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_id_company ON public.profiles USING btree (id, company_id);


--
-- Name: INDEX idx_profiles_id_company; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_profiles_id_company IS 'Composite index for RLS helper function performance. Used by get_my_company_id() to quickly lookup company_id by user id.';


--
-- Name: idx_profiles_id_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_id_role ON public.profiles USING btree (id, role) WHERE (role = ANY (ARRAY['admin'::text, 'manager'::text]));


--
-- Name: INDEX idx_profiles_id_role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_profiles_id_role IS 'Partial index for admin/manager role checks in RLS policies. Only indexes admin and manager roles for efficiency.';


--
-- Name: idx_query_performance_logs_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_query_performance_logs_company ON public.query_performance_logs USING btree (company_id);


--
-- Name: idx_query_performance_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_query_performance_logs_timestamp ON public.query_performance_logs USING btree ("timestamp");


--
-- Name: idx_tables_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tables_company ON public.tables USING btree (company_id);


--
-- Name: idx_tables_environment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tables_environment ON public.tables USING btree (environment_id);


--
-- Name: companies companies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_companies_updated_at();


--
-- Name: companies on_company_created_seed_config; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_company_created_seed_config AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_config();


--
-- Name: pizza_extras trigger_update_pizza_extras_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_pizza_extras_updated_at BEFORE UPDATE ON public.pizza_extras FOR EACH ROW EXECUTE FUNCTION public.update_pizza_extras_updated_at();


--
-- Name: cash_registers update_cash_registers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comandas update_comandas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON public.comandas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: app_configurations app_configurations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_configurations
    ADD CONSTRAINT app_configurations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: cash_movements cash_movements_cash_register_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id) ON DELETE CASCADE;


--
-- Name: cash_movements cash_movements_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: cash_movements cash_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: cash_registers cash_registers_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: cash_registers cash_registers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: cash_registers cash_registers_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT cash_registers_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.profiles(id);


--
-- Name: comandas comandas_canceled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_canceled_by_fkey FOREIGN KEY (canceled_by) REFERENCES public.profiles(id);


--
-- Name: comandas comandas_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: comandas comandas_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: comandas comandas_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.profiles(id);


--
-- Name: companies companies_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: daily_statistics daily_statistics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_statistics
    ADD CONSTRAINT daily_statistics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: estoque estoque_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: inventory inventory_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: order_transfers order_transfers_from_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_from_table_id_fkey FOREIGN KEY (from_table_id) REFERENCES public.tables(id) ON DELETE SET NULL;


--
-- Name: order_transfers order_transfers_from_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_from_waiter_id_fkey FOREIGN KEY (from_waiter_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: order_transfers order_transfers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_transfers order_transfers_to_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_to_table_id_fkey FOREIGN KEY (to_table_id) REFERENCES public.tables(id) ON DELETE SET NULL;


--
-- Name: order_transfers order_transfers_to_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_to_waiter_id_fkey FOREIGN KEY (to_waiter_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: order_transfers order_transfers_transferred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_transfers
    ADD CONSTRAINT order_transfers_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: pagamentos pagamentos_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.profiles(id);


--
-- Name: pizza_extras pizza_extras_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pizza_extras
    ADD CONSTRAINT pizza_extras_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: products products_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: profiles profiles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tables tables_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id) ON DELETE SET NULL;


--
-- Name: cash_movements Admins can delete cash movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete cash movements" ON public.cash_movements FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete cash movements" ON cash_movements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete cash movements" ON public.cash_movements IS 'Only admins and managers can delete cash movements. Uses optimized helper function.';


--
-- Name: cash_registers Admins can delete cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete cash registers" ON public.cash_registers FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete cash registers" ON cash_registers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete cash registers" ON public.cash_registers IS 'Only admins and managers can delete cash registers. Uses optimized helper function.';


--
-- Name: comandas Admins can delete comandas; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete comandas" ON public.comandas FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete comandas" ON comandas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete comandas" ON public.comandas IS 'Only admins and managers can delete comandas. Uses optimized helper function.';


--
-- Name: orders Admins can delete orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete orders" ON orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete orders" ON public.orders IS 'Only admins and managers can delete orders.';


--
-- Name: pagamentos Admins can delete payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete payments" ON public.pagamentos FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete payments" ON pagamentos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete payments" ON public.pagamentos IS 'Only admins and managers can delete payments.';


--
-- Name: products Admins can delete products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can delete products" ON products; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can delete products" ON public.products IS 'Only admins and managers can delete products. Uses optimized helper functions.';


--
-- Name: products Admins can insert products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can insert products" ON products; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can insert products" ON public.products IS 'Only admins and managers can create new products. Uses optimized helper functions.';


--
-- Name: app_configurations Admins can insert/update configurations for their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert/update configurations for their company" ON public.app_configurations USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.company_id = app_configurations.company_id) AND (profiles.role = 'admin'::text)))));


--
-- Name: companies Admins can update company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update company" ON public.companies FOR UPDATE USING (((id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can update company" ON companies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can update company" ON public.companies IS 'Only admins and managers can update company data.';


--
-- Name: products Admins can update products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can update products" ON products; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can update products" ON public.products IS 'Only admins and managers can update products. Uses optimized helper functions.';


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (((company_id = public.get_my_company_id()) AND public.is_admin_or_manager()));


--
-- Name: POLICY "Admins can view audit logs" ON audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Admins can view audit logs" ON public.audit_logs IS 'Only admins and managers can view audit logs. Uses optimized helper functions.';


--
-- Name: query_performance_logs Allow insert for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow insert for authenticated users" ON public.query_performance_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: query_performance_logs Allow select for own logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow select for own logs" ON public.query_performance_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: companies Companies read access_v2; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Companies read access_v2" ON public.companies FOR SELECT TO authenticated USING (true);


--
-- Name: environments Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.environments USING ((auth.role() = 'authenticated'::text));


--
-- Name: order_transfers Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.order_transfers USING ((auth.role() = 'authenticated'::text));


--
-- Name: tables Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.tables USING ((auth.role() = 'authenticated'::text));


--
-- Name: inventory Enable all access for authenticated users based on company_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users based on company_id" ON public.inventory TO authenticated USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))) WITH CHECK ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: companies Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.companies FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: products Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON public.products FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: cash_registers Managers can manage cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage cash registers" ON public.cash_registers USING (((company_id = public.get_my_company_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: cash_movements Managers can manage movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage movements" ON public.cash_movements USING (((company_id = public.get_my_company_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: companies Managers can update their company settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can update their company settings" ON public.companies FOR UPDATE USING (((id = public.get_my_company_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: products Products read access_v2; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Products read access_v2" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: daily_statistics System can manage statistics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can manage statistics" ON public.daily_statistics USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "System can manage statistics" ON daily_statistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "System can manage statistics" ON public.daily_statistics IS 'System can insert and update statistics. Company-level security enforced.';


--
-- Name: cash_movements Users can create cash movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create cash movements" ON public.cash_movements FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: cash_registers Users can create cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create cash registers" ON public.cash_registers FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: comandas Users can create comandas; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create comandas" ON public.comandas FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: orders Users can create company orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create company orders" ON public.orders FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can create company orders" ON orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can create company orders" ON public.orders IS 'All users can create orders in their company.';


--
-- Name: pagamentos Users can create payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create payments" ON public.pagamentos FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: comandas Users can delete comandas from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete comandas from their company" ON public.comandas FOR DELETE USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: orders Users can delete orders from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete orders from their company" ON public.orders FOR DELETE USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: pizza_extras Users can delete their company's pizza extras; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their company's pizza extras" ON public.pizza_extras FOR DELETE USING ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: audit_logs Users can insert audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can insert audit logs" ON audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can insert audit logs" ON public.audit_logs IS 'All users can insert audit logs for their company. Application ensures data integrity.';


--
-- Name: cash_registers Users can insert cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert cash registers" ON public.cash_registers FOR INSERT WITH CHECK ((company_id = public.get_my_company_id()));


--
-- Name: comandas Users can insert comandas for their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert comandas for their company" ON public.comandas FOR INSERT WITH CHECK ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: orders Users can insert orders for their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert orders for their company" ON public.orders FOR INSERT WITH CHECK ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: pizza_extras Users can insert pizza extras for their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert pizza extras for their company" ON public.pizza_extras FOR INSERT WITH CHECK ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: comandas Users can manage comandas; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage comandas" ON public.comandas USING ((company_id = public.get_my_company_id()));


--
-- Name: products Users can manage products from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage products from their company" ON public.products USING ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.company_id = products.company_id))));


--
-- Name: cash_registers Users can update cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update cash registers" ON public.cash_registers FOR UPDATE USING ((company_id = public.get_my_company_id()));


--
-- Name: cash_registers Users can update cash registers (sales); Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update cash registers (sales)" ON public.cash_registers FOR UPDATE USING ((company_id = public.get_my_company_id()));


--
-- Name: comandas Users can update comandas; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update comandas" ON public.comandas FOR UPDATE USING ((company_id = public.get_my_company_id()));


--
-- Name: comandas Users can update comandas from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update comandas from their company" ON public.comandas FOR UPDATE USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: orders Users can update company orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update company orders" ON public.orders FOR UPDATE USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can update company orders" ON orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can update company orders" ON public.orders IS 'All users can update orders in their company.';


--
-- Name: orders Users can update orders from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update orders from their company" ON public.orders FOR UPDATE USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: pagamentos Users can update payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update payments" ON public.pagamentos FOR UPDATE USING ((company_id = public.get_my_company_id()));


--
-- Name: pizza_extras Users can update their company's pizza extras; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their company's pizza extras" ON public.pizza_extras FOR UPDATE USING ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: comandas Users can view comandas from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view comandas from their company" ON public.comandas FOR SELECT USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: cash_movements Users can view company cash movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company cash movements" ON public.cash_movements FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company cash movements" ON cash_movements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company cash movements" ON public.cash_movements IS 'All users can view cash movements in their company.';


--
-- Name: cash_registers Users can view company cash registers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company cash registers" ON public.cash_registers FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company cash registers" ON cash_registers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company cash registers" ON public.cash_registers IS 'All users can view cash registers in their company.';


--
-- Name: comandas Users can view company comandas; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company comandas" ON public.comandas FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company comandas" ON comandas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company comandas" ON public.comandas IS 'All users can view comandas in their company.';


--
-- Name: orders Users can view company orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company orders" ON public.orders FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company orders" ON orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company orders" ON public.orders IS 'All users can view orders in their company. Uses indexed company_id column.';


--
-- Name: pagamentos Users can view company payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company payments" ON public.pagamentos FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company payments" ON pagamentos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company payments" ON public.pagamentos IS 'All users can view payments in their company.';


--
-- Name: products Users can view company products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company products" ON public.products FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company products" ON products; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company products" ON public.products IS 'All users can view products in their company.';


--
-- Name: daily_statistics Users can view company statistics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view company statistics" ON public.daily_statistics FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view company statistics" ON daily_statistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view company statistics" ON public.daily_statistics IS 'All users can view statistics for their company.';


--
-- Name: app_configurations Users can view configurations for their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view configurations for their company" ON public.app_configurations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.company_id = app_configurations.company_id)))));


--
-- Name: cash_movements Users can view movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view movements" ON public.cash_movements FOR SELECT USING ((company_id = public.get_my_company_id()));


--
-- Name: orders Users can view orders from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view orders from their company" ON public.orders FOR SELECT USING ((company_id = ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: companies Users can view own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING ((id = public.get_my_company_id()));


--
-- Name: POLICY "Users can view own company" ON companies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Users can view own company" ON public.companies IS 'All users can view their own company data.';


--
-- Name: products Users can view products from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view products from their company" ON public.products FOR SELECT USING ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.company_id = products.company_id))));


--
-- Name: pizza_extras Users can view their company's pizza extras; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their company's pizza extras" ON public.pizza_extras FOR SELECT USING ((company_id IN ( SELECT profiles.company_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: app_configurations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings authenticated_all_app_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_all_app_settings ON public.app_settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: estoque authenticated_all_estoque; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_all_estoque ON public.estoque TO authenticated USING (true) WITH CHECK (true);


--
-- Name: suppliers authenticated_all_suppliers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_all_suppliers ON public.suppliers TO authenticated USING (true) WITH CHECK (true);


--
-- Name: profiles authenticated_pull_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_pull_profiles ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles authenticated_update_own_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_update_own_profile ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: cash_movements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_registers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

--
-- Name: comandas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_statistics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;

--
-- Name: environments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

--
-- Name: estoque; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: order_transfers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: pagamentos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: partition_maintenance_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.partition_maintenance_config ENABLE ROW LEVEL SECURITY;

--
-- Name: pizza_extras; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pizza_extras ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: query_performance_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: tables; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION archive_old_partition(partition_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.archive_old_partition(partition_name text) TO anon;
GRANT ALL ON FUNCTION public.archive_old_partition(partition_name text) TO authenticated;
GRANT ALL ON FUNCTION public.archive_old_partition(partition_name text) TO service_role;


--
-- Name: FUNCTION cleanup_old_partitions(retention_months integer, archive_mode boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_partitions(retention_months integer, archive_mode boolean) TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_partitions(retention_months integer, archive_mode boolean) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_partitions(retention_months integer, archive_mode boolean) TO service_role;


--
-- Name: FUNCTION close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text) TO anon;
GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_final_amount numeric, p_notes text) TO service_role;


--
-- Name: FUNCTION close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) TO anon;
GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) TO authenticated;
GRANT ALL ON FUNCTION public.close_cash_register(p_register_id uuid, p_closed_by uuid, p_closed_by_name text, p_actual_balance numeric) TO service_role;


--
-- Name: FUNCTION close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric) TO anon;
GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_total_amount numeric) TO service_role;


--
-- Name: FUNCTION close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) TO anon;
GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) TO authenticated;
GRANT ALL ON FUNCTION public.close_comanda(p_comanda_id uuid, p_closed_by uuid, p_closed_by_name text) TO service_role;


--
-- Name: FUNCTION create_monthly_partition(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_monthly_partition() TO anon;
GRANT ALL ON FUNCTION public.create_monthly_partition() TO authenticated;
GRANT ALL ON FUNCTION public.create_monthly_partition() TO service_role;


--
-- Name: FUNCTION create_partitions_for_range(start_month date, end_month date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_partitions_for_range(start_month date, end_month date) TO anon;
GRANT ALL ON FUNCTION public.create_partitions_for_range(start_month date, end_month date) TO authenticated;
GRANT ALL ON FUNCTION public.create_partitions_for_range(start_month date, end_month date) TO service_role;


--
-- Name: FUNCTION drop_old_partition(partition_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.drop_old_partition(partition_name text) TO anon;
GRANT ALL ON FUNCTION public.drop_old_partition(partition_name text) TO authenticated;
GRANT ALL ON FUNCTION public.drop_old_partition(partition_name text) TO service_role;


--
-- Name: FUNCTION execute_sql(query text, params jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.execute_sql(query text, params jsonb) TO anon;
GRANT ALL ON FUNCTION public.execute_sql(query text, params jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.execute_sql(query text, params jsonb) TO service_role;


--
-- Name: FUNCTION get_autovacuum_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_autovacuum_config() TO anon;
GRANT ALL ON FUNCTION public.get_autovacuum_config() TO authenticated;
GRANT ALL ON FUNCTION public.get_autovacuum_config() TO service_role;


--
-- Name: FUNCTION get_autovacuum_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_autovacuum_stats() TO anon;
GRANT ALL ON FUNCTION public.get_autovacuum_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_autovacuum_stats() TO service_role;


--
-- Name: FUNCTION get_checkpoint_wal_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_checkpoint_wal_config() TO anon;
GRANT ALL ON FUNCTION public.get_checkpoint_wal_config() TO authenticated;
GRANT ALL ON FUNCTION public.get_checkpoint_wal_config() TO service_role;


--
-- Name: FUNCTION get_my_company_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_company_id() TO anon;
GRANT ALL ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_company_id() TO service_role;


--
-- Name: FUNCTION get_my_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_role() TO anon;
GRANT ALL ON FUNCTION public.get_my_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_role() TO service_role;


--
-- Name: FUNCTION get_next_comanda_number(p_company_id uuid, p_date_key date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date) TO anon;
GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date) TO authenticated;
GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key date) TO service_role;


--
-- Name: FUNCTION get_next_comanda_number(p_company_id uuid, p_date_key text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key text) TO anon;
GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key text) TO authenticated;
GRANT ALL ON FUNCTION public.get_next_comanda_number(p_company_id uuid, p_date_key text) TO service_role;


--
-- Name: FUNCTION get_partition_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_partition_status() TO anon;
GRANT ALL ON FUNCTION public.get_partition_status() TO authenticated;
GRANT ALL ON FUNCTION public.get_partition_status() TO service_role;


--
-- Name: FUNCTION get_performance_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_performance_config() TO anon;
GRANT ALL ON FUNCTION public.get_performance_config() TO authenticated;
GRANT ALL ON FUNCTION public.get_performance_config() TO service_role;


--
-- Name: FUNCTION get_tables_needing_vacuum(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_tables_needing_vacuum() TO anon;
GRANT ALL ON FUNCTION public.get_tables_needing_vacuum() TO authenticated;
GRANT ALL ON FUNCTION public.get_tables_needing_vacuum() TO service_role;


--
-- Name: FUNCTION get_wal_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_wal_stats() TO anon;
GRANT ALL ON FUNCTION public.get_wal_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_wal_stats() TO service_role;


--
-- Name: FUNCTION handle_new_company_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_company_config() TO anon;
GRANT ALL ON FUNCTION public.handle_new_company_config() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_company_config() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin_or_manager(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin_or_manager() TO anon;
GRANT ALL ON FUNCTION public.is_admin_or_manager() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin_or_manager() TO service_role;


--
-- Name: FUNCTION registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text) TO anon;
GRANT ALL ON FUNCTION public.registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text) TO authenticated;
GRANT ALL ON FUNCTION public.registrar_pagamento_comanda(p_company_id uuid, p_comanda_id uuid, p_comanda_number text, p_date_key text, p_valor numeric, p_forma text, p_usuario_id uuid, p_usuario_nome text, p_total_pago numeric, p_saldo_aberto numeric, p_pagamentos_resumo jsonb, p_garcom uuid, p_garcom_nome text) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION run_scheduled_partition_maintenance(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.run_scheduled_partition_maintenance() TO anon;
GRANT ALL ON FUNCTION public.run_scheduled_partition_maintenance() TO authenticated;
GRANT ALL ON FUNCTION public.run_scheduled_partition_maintenance() TO service_role;


--
-- Name: FUNCTION should_partition_orders(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.should_partition_orders() TO anon;
GRANT ALL ON FUNCTION public.should_partition_orders() TO authenticated;
GRANT ALL ON FUNCTION public.should_partition_orders() TO service_role;


--
-- Name: FUNCTION update_companies_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_companies_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_companies_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_companies_updated_at() TO service_role;


--
-- Name: FUNCTION update_pizza_extras_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_pizza_extras_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_pizza_extras_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_pizza_extras_updated_at() TO service_role;


--
-- Name: FUNCTION update_settings_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_settings_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_settings_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_settings_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION user_in_company(target_company_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_in_company(target_company_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_in_company(target_company_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_in_company(target_company_id uuid) TO service_role;


--
-- Name: TABLE app_configurations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.app_configurations TO anon;
GRANT ALL ON TABLE public.app_configurations TO authenticated;
GRANT ALL ON TABLE public.app_configurations TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE cash_movements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cash_movements TO anon;
GRANT ALL ON TABLE public.cash_movements TO authenticated;
GRANT ALL ON TABLE public.cash_movements TO service_role;


--
-- Name: TABLE cash_registers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cash_registers TO anon;
GRANT ALL ON TABLE public.cash_registers TO authenticated;
GRANT ALL ON TABLE public.cash_registers TO service_role;


--
-- Name: TABLE comandas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.comandas TO anon;
GRANT ALL ON TABLE public.comandas TO authenticated;
GRANT ALL ON TABLE public.comandas TO service_role;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Name: TABLE daily_statistics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.daily_statistics TO anon;
GRANT ALL ON TABLE public.daily_statistics TO authenticated;
GRANT ALL ON TABLE public.daily_statistics TO service_role;


--
-- Name: TABLE environments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.environments TO anon;
GRANT ALL ON TABLE public.environments TO authenticated;
GRANT ALL ON TABLE public.environments TO service_role;


--
-- Name: TABLE estoque; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.estoque TO anon;
GRANT ALL ON TABLE public.estoque TO authenticated;
GRANT ALL ON TABLE public.estoque TO service_role;


--
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory TO anon;
GRANT ALL ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO service_role;


--
-- Name: TABLE order_transfers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_transfers TO anon;
GRANT ALL ON TABLE public.order_transfers TO authenticated;
GRANT ALL ON TABLE public.order_transfers TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE pagamentos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pagamentos TO anon;
GRANT ALL ON TABLE public.pagamentos TO authenticated;
GRANT ALL ON TABLE public.pagamentos TO service_role;


--
-- Name: TABLE partition_maintenance_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partition_maintenance_config TO anon;
GRANT ALL ON TABLE public.partition_maintenance_config TO authenticated;
GRANT ALL ON TABLE public.partition_maintenance_config TO service_role;


--
-- Name: TABLE pizza_extras; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pizza_extras TO anon;
GRANT ALL ON TABLE public.pizza_extras TO authenticated;
GRANT ALL ON TABLE public.pizza_extras TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE query_performance_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.query_performance_logs TO anon;
GRANT ALL ON TABLE public.query_performance_logs TO authenticated;
GRANT ALL ON TABLE public.query_performance_logs TO service_role;


--
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO anon;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;


--
-- Name: TABLE tables; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tables TO anon;
GRANT ALL ON TABLE public.tables TO authenticated;
GRANT ALL ON TABLE public.tables TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict fSdbMsn9vpcz5bfz4Ws0Olu2RUxkgAOA1MKW23ZidiTC6RxaytEb9EoCAOJWB5b

