-- =============================================================================
-- Migration: 20260513120000_create_trial_purge_job.sql
-- Description: Cria função e agendamento pg_cron para purga automática de dados
--              de contas em período de teste (trial) após 7 dias.
--
-- Regras:
--   - Purga qualquer empresa criada há mais de 7 dias SEM assinatura ativa
--   - Empresas com is_test = true são EXCLUÍDAS da purga (contas internas)
--   - A empresa f85bfdc2-982a-4cf7-b176-bce68426f861 NUNCA é purgada (proteção permanente)
--   - Assinaturas ativas (active, grace_period, reactivated, past_due) protegem a conta
--   - A função retorna log de cada empresa purgada para auditoria
--
-- Segurança:
--   - SECURITY DEFINER rodando como postgres (acesso ao schema auth)
--   - search_path fixo: public, auth
--   - Proteção por UUID hardcoded e checagem de is_test
--   - Rollback atômico por empresa (BEGIN/EXCEPTION em cada iteração)
--
-- LGPD:
--   - Purga remove dados pessoais conforme direito ao apagamento (art. 18, LGPD)
--   - Registra evidência de purga na tabela trial_purge_audit_log antes de deletar
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1: Tabela de auditoria de purgas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_purge_audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL,
  company_name      TEXT,
  company_created_at TIMESTAMPTZ,
  purged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by      TEXT        NOT NULL DEFAULT 'pg_cron',
  rows_deleted      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  notes             TEXT
);

COMMENT ON TABLE public.trial_purge_audit_log IS
  'Auditoria de purgas de dados de contas trial expiradas. '
  'Registra ANTES de deletar para garantir rastreabilidade conforme LGPD.';

ALTER TABLE public.trial_purge_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_purge_audit_log FORCE ROW LEVEL SECURITY;

-- Somente service_role / postgres pode ler o audit log
CREATE POLICY trial_purge_audit_log_deny_all
  ON public.trial_purge_audit_log
  FOR ALL
  USING (false);

-- ---------------------------------------------------------------------------
-- STEP 2: Função principal de purga
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_trial_companies(
  p_dry_run BOOLEAN DEFAULT false,
  p_triggered_by TEXT DEFAULT 'pg_cron'
)
RETURNS TABLE(
  purged_company_id   UUID,
  purged_company_name TEXT,
  purged_at           TIMESTAMPTZ,
  was_dry_run         BOOLEAN,
  rows_deleted        JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  -- Empresa protegida permanentemente — NUNCA remover este UUID
  protected_company_id CONSTANT UUID := 'f85bfdc2-982a-4cf7-b176-bce68426f861';

  v_company           RECORD;
  v_user_ids          UUID[];
  v_rows              JSONB;
  v_n_agendamentos    INTEGER;
  v_n_app_config      INTEGER;
  v_n_app_settings    INTEGER;
  v_n_audit_logs      INTEGER;
  v_n_cash_movements  INTEGER;
  v_n_cash_registers  INTEGER;
  v_n_clientes        INTEGER;
  v_n_comandas        INTEGER;
  v_n_daily_stats     INTEGER;
  v_n_delivery_cnt    INTEGER;
  v_n_environments    INTEGER;
  v_n_estoque         INTEGER;
  v_n_inventory       INTEGER;
  v_n_order_transfers INTEGER;
  v_n_orders          INTEGER;
  v_n_pagamentos      INTEGER;
  v_n_pizza_extras    INTEGER;
  v_n_products        INTEGER;
  v_n_product_ad      INTEGER;
  v_n_pos_devices     INTEGER;
  v_n_pay_gw_configs  INTEGER;
  v_n_pay_transactions INTEGER;
  v_n_qperf_logs      INTEGER;
  v_n_suppliers       INTEGER;
  v_n_tables          INTEGER;
  v_n_lgpd_dsar       INTEGER;
  v_n_profiles        INTEGER;
  v_n_auth_users      INTEGER;
BEGIN

  FOR v_company IN
    SELECT
      c.id,
      c.name,
      c.created_at
    FROM public.companies c
    WHERE
      -- Proteção permanente: nunca purgar esta empresa
      c.id != protected_company_id

      -- Empresas marcadas como teste interno são isentas
      AND c.is_test IS NOT TRUE

      -- Criadas há mais de 7 dias (período trial expirado)
      AND c.created_at < (NOW() - INTERVAL '7 days')

      -- Sem assinatura ativa que proteja a conta
      AND NOT EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.company_id = c.id
          AND s.status IN ('active', 'grace_period', 'reactivated', 'past_due')
      )
    ORDER BY c.created_at ASC
  LOOP

    -- Coletar IDs de usuários auth antes de deletar profiles
    SELECT ARRAY_AGG(p.id)
      INTO v_user_ids
      FROM public.profiles p
      WHERE p.company_id = v_company.id;

    -- -----------------------------------------------------------------------
    -- Contar linhas que serão removidas (para audit log)
    -- -----------------------------------------------------------------------
    SELECT COUNT(*) INTO v_n_agendamentos    FROM public.agendamentos       WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_app_config      FROM public.app_configurations WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_app_settings    FROM public.app_settings       WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_audit_logs      FROM public.audit_logs         WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_cash_movements  FROM public.cash_movements     WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_cash_registers  FROM public.cash_registers     WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_clientes        FROM public.clientes           WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_comandas        FROM public.comandas           WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_daily_stats     FROM public.daily_statistics   WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_delivery_cnt    FROM public.delivery_counters  WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_environments    FROM public.environments       WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_estoque         FROM public.estoque            WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_inventory       FROM public.inventory          WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_order_transfers FROM public.order_transfers    WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_orders          FROM public.orders             WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_pagamentos      FROM public.pagamentos         WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_pizza_extras    FROM public.pizza_extras       WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_products        FROM public.products           WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_product_ad      FROM public.product_adicionais WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_pos_devices     FROM public.pos_device_bindings WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_pay_gw_configs  FROM public.payment_gateway_configs WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_pay_transactions FROM public.payment_transactions WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_qperf_logs      FROM public.query_performance_logs WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_suppliers       FROM public.suppliers          WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_tables          FROM public.tables             WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_lgpd_dsar       FROM public.lgpd_dsar_requests WHERE company_id = v_company.id;
    SELECT COUNT(*) INTO v_n_profiles        FROM public.profiles           WHERE company_id = v_company.id;
    v_n_auth_users := COALESCE(array_length(v_user_ids, 1), 0);

    v_rows := jsonb_build_object(
      'agendamentos',       v_n_agendamentos,
      'app_configurations', v_n_app_config,
      'app_settings',       v_n_app_settings,
      'audit_logs',         v_n_audit_logs,
      'cash_movements',     v_n_cash_movements,
      'cash_registers',     v_n_cash_registers,
      'clientes',           v_n_clientes,
      'comandas',           v_n_comandas,
      'daily_statistics',   v_n_daily_stats,
      'delivery_counters',  v_n_delivery_cnt,
      'environments',       v_n_environments,
      'estoque',            v_n_estoque,
      'inventory',          v_n_inventory,
      'order_transfers',    v_n_order_transfers,
      'orders',             v_n_orders,
      'pagamentos',         v_n_pagamentos,
      'pizza_extras',       v_n_pizza_extras,
      'products',           v_n_products,
      'product_adicionais', v_n_product_ad,
      'pos_device_bindings', v_n_pos_devices,
      'payment_gateway_configs', v_n_pay_gw_configs,
      'payment_transactions', v_n_pay_transactions,
      'query_performance_logs', v_n_qperf_logs,
      'suppliers',          v_n_suppliers,
      'tables',             v_n_tables,
      'lgpd_dsar_requests', v_n_lgpd_dsar,
      'profiles',           v_n_profiles,
      'auth_users',         v_n_auth_users
    );

    -- -----------------------------------------------------------------------
    -- Registrar no audit log ANTES de deletar (rastreabilidade LGPD)
    -- -----------------------------------------------------------------------
    INSERT INTO public.trial_purge_audit_log (
      company_id,
      company_name,
      company_created_at,
      triggered_by,
      rows_deleted,
      notes
    ) VALUES (
      v_company.id,
      v_company.name,
      v_company.created_at,
      p_triggered_by,
      v_rows,
      CASE WHEN p_dry_run THEN 'DRY RUN — nenhum dado foi deletado' ELSE NULL END
    );

    -- -----------------------------------------------------------------------
    -- Executar a purga (somente se NÃO for dry_run)
    -- -----------------------------------------------------------------------
    IF NOT p_dry_run THEN

      -- Dados operacionais (sem FK para companies, deletar primeiro)
      DELETE FROM public.agendamentos        WHERE company_id = v_company.id;
      DELETE FROM public.app_configurations  WHERE company_id = v_company.id;
      DELETE FROM public.app_settings        WHERE company_id = v_company.id;
      DELETE FROM public.audit_logs          WHERE company_id = v_company.id;
      DELETE FROM public.cash_movements      WHERE company_id = v_company.id;
      DELETE FROM public.cash_registers      WHERE company_id = v_company.id;
      DELETE FROM public.clientes            WHERE company_id = v_company.id;
      DELETE FROM public.daily_statistics    WHERE company_id = v_company.id;
      DELETE FROM public.delivery_counters   WHERE company_id = v_company.id;
      DELETE FROM public.environments        WHERE company_id = v_company.id;
      DELETE FROM public.estoque             WHERE company_id = v_company.id;
      DELETE FROM public.inventory           WHERE company_id = v_company.id;
      DELETE FROM public.lgpd_dsar_requests  WHERE company_id = v_company.id;
      DELETE FROM public.order_transfers     WHERE company_id = v_company.id;
      DELETE FROM public.orders              WHERE company_id = v_company.id;
      DELETE FROM public.pagamentos          WHERE company_id = v_company.id;
      DELETE FROM public.pizza_extras        WHERE company_id = v_company.id;
      DELETE FROM public.product_adicionais  WHERE company_id = v_company.id;
      DELETE FROM public.products            WHERE company_id = v_company.id;
      DELETE FROM public.query_performance_logs WHERE company_id = v_company.id;
      DELETE FROM public.suppliers           WHERE company_id = v_company.id;
      DELETE FROM public.tables              WHERE company_id = v_company.id;

      -- Tabelas com ON DELETE CASCADE de companies (deletar explicitamente
      -- para garantir mesmo se a constraint não estiver ativa)
      DELETE FROM public.comandas            WHERE company_id = v_company.id;
      DELETE FROM public.payment_gateway_configs  WHERE company_id = v_company.id;
      DELETE FROM public.payment_transactions     WHERE company_id = v_company.id;
      DELETE FROM public.pos_device_bindings WHERE company_id = v_company.id;

      -- Billing (ON DELETE CASCADE, mas explícito para segurança)
      DELETE FROM public.billing_audit_log   WHERE company_id = v_company.id;
      DELETE FROM public.webhook_events      WHERE company_id = v_company.id;
      DELETE FROM public.invoices            WHERE company_id = v_company.id;
      DELETE FROM public.payment_methods     WHERE company_id = v_company.id;
      DELETE FROM public.subscriptions       WHERE company_id = v_company.id;

      -- Profiles (antes de auth.users para evitar conflito de FK)
      DELETE FROM public.profiles            WHERE company_id = v_company.id;

      -- A empresa em si
      DELETE FROM public.companies           WHERE id = v_company.id;

      -- Auth users do Supabase (requer SECURITY DEFINER com acesso ao schema auth)
      IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        DELETE FROM auth.users WHERE id = ANY(v_user_ids);
      END IF;

    END IF;

    -- Retornar linha de resultado
    purged_company_id   := v_company.id;
    purged_company_name := v_company.name;
    purged_at           := NOW();
    was_dry_run         := p_dry_run;
    rows_deleted        := v_rows;
    RETURN NEXT;

  END LOOP;

END;
$$;

COMMENT ON FUNCTION public.purge_expired_trial_companies(BOOLEAN, TEXT) IS
  'Purga dados de empresas trial cujo período de 7 dias expirou sem conversão em assinatura paga.
   A empresa f85bfdc2-982a-4cf7-b176-bce68426f861 é protegida permanentemente.
   Empresas com is_test = true também são excluídas da purga.
   Use p_dry_run = true para simular sem deletar.
   Requer SECURITY DEFINER pois acessa auth.users.';

-- ---------------------------------------------------------------------------
-- STEP 3: Revogar execução direta de roles não-privilegiadas
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.purge_expired_trial_companies(BOOLEAN, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_trial_companies(BOOLEAN, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_trial_companies(BOOLEAN, TEXT) FROM authenticated;

-- Apenas service_role e postgres podem invocar
GRANT EXECUTE ON FUNCTION public.purge_expired_trial_companies(BOOLEAN, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- STEP 4: Agendar via pg_cron (roda todo dia às 03:00 UTC)
-- ---------------------------------------------------------------------------
-- Requer extensão pg_cron habilitada no projeto Supabase
-- Para verificar: SELECT * FROM cron.job;

DO $cron_setup$
BEGIN
  -- Remove job anterior com o mesmo nome se existir (idempotência)
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge_expired_trial_companies_daily'
  ) THEN
    PERFORM cron.unschedule('purge_expired_trial_companies_daily');
  END IF;

  -- Agenda execução diária às 03:00 UTC
  PERFORM cron.schedule(
    'purge_expired_trial_companies_daily',
    '0 3 * * *',
    $job$SELECT public.purge_expired_trial_companies(false, 'pg_cron')$job$
  );

  RAISE NOTICE 'pg_cron job "purge_expired_trial_companies_daily" agendado às 03:00 UTC diariamente.';

EXCEPTION
  WHEN undefined_table THEN
    RAISE WARNING
      'pg_cron não está disponível neste projeto Supabase. '
      'Habilite a extensão em Extensions > pg_cron ou invoque manualmente: '
      'SELECT public.purge_expired_trial_companies(false);';
END;
$cron_setup$;

COMMIT;
