-- Migration: harden_anon_function_grants_cardapio
-- Date: 2026-03-25
-- Priority: CRÍTICO
-- Context: Com a abertura de rotas públicas (cardápio QR / anon), verificou-se que:
--   1. execute_sql(SECURITY DEFINER) está acessível por anon → RCE/SQL arbitrário como postgres
--   2. Funções financeiras críticas (pagamento, caixa, comanda) acessíveis por anon
--   3. DEFAULT PRIVILEGES concedem ALL ON FUNCTIONS/TABLES a anon automaticamente
--   4. public_menu_company_read expõe colunas sensíveis (cnpj, document, settings, plan)
--   5. get_company_by_menu_slug SECURITY DEFINER sem SET search_path

-- ============================================================
-- 1. REVOGAR execute_sql de anon APENAS
--    (SECURITY DEFINER + callable by anon = execução SQL arbitrária como postgres)
--
--    ATENÇÃO: NÃO revogar de `authenticated` — os serviços de otimização em produção
--    (QueryOptimizerService, PerformanceMonitorService, ConnectionPoolManager) chamam
--    rpc('execute_sql') com usuário autenticado. Remover de authenticated quebra esses
--    serviços sem alterar código.
--    TODO: em ciclo separado, refatorar esses serviços para usar EXPLAIN nativo do
--    Supabase e então revogar de authenticated também.
-- ============================================================
REVOKE ALL ON FUNCTION "public"."execute_sql"("query" text, "params" jsonb) FROM anon;

-- ============================================================
-- 2. REVOGAR funções financeiras/operacionais de anon
--    Todas são SECURITY DEFINER — companhia_id não é isolado por RLS nessas chamadas
-- ============================================================

-- Registro de pagamento (insert em pagamentos + update comandas)
REVOKE ALL ON FUNCTION "public"."registrar_pagamento_comanda"(
  "p_company_id" uuid, "p_comanda_id" uuid, "p_comanda_number" text,
  "p_date_key" text, "p_valor" numeric, "p_forma" text,
  "p_usuario_id" uuid, "p_usuario_nome" text, "p_total_pago" numeric,
  "p_saldo_aberto" numeric, "p_pagamentos_resumo" jsonb,
  "p_garcom" uuid, "p_garcom_nome" text
) FROM anon;

-- Fechamento de caixa (ambas assinaturas)
REVOKE ALL ON FUNCTION "public"."close_cash_register"(
  "p_register_id" uuid, "p_closed_by" uuid, "p_final_amount" numeric, "p_notes" text
) FROM anon;
REVOKE ALL ON FUNCTION "public"."close_cash_register"(
  "p_register_id" uuid, "p_closed_by" uuid, "p_closed_by_name" text, "p_actual_balance" numeric
) FROM anon;

-- Fechamento de comanda (ambas assinaturas)
REVOKE ALL ON FUNCTION "public"."close_comanda"(
  "p_comanda_id" uuid, "p_closed_by" uuid, "p_total_amount" numeric
) FROM anon;
REVOKE ALL ON FUNCTION "public"."close_comanda"(
  "p_comanda_id" uuid, "p_closed_by" uuid, "p_closed_by_name" text
) FROM anon;

-- Consumo atômico (insert em consumo/caixa)
REVOKE ALL ON FUNCTION "public"."adicionar_consumo_atomico"(
  TEXT, TEXT, TEXT, NUMERIC
) FROM anon;

-- Numeração de comanda delivery
REVOKE ALL ON FUNCTION "public"."get_next_delivery_comanda_number"(
  "p_company_id" uuid, "p_date_key" text
) FROM anon;

-- ============================================================
-- 3. REVOGAR funções de manutenção/infraestrutura de anon
--    Não devem ser acessíveis por clientes externos de forma alguma
-- ============================================================
REVOKE ALL ON FUNCTION "public"."archive_old_partition"("partition_name" text) FROM anon;
REVOKE ALL ON FUNCTION "public"."cleanup_old_partitions"("retention_months" integer, "archive_mode" boolean) FROM anon;
REVOKE ALL ON FUNCTION "public"."create_monthly_partition"() FROM anon;
REVOKE ALL ON FUNCTION "public"."create_partitions_for_range"("start_month" date, "end_month" date) FROM anon;
REVOKE ALL ON FUNCTION "public"."drop_old_partition"("partition_name" text) FROM anon;
REVOKE ALL ON FUNCTION "public"."run_scheduled_partition_maintenance"() FROM anon;
REVOKE ALL ON FUNCTION "public"."should_partition_orders"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_partition_status"() FROM anon;
REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM anon;

-- Funções de diagnóstico interno (informações de configuração do servidor)
REVOKE ALL ON FUNCTION "public"."get_autovacuum_config"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_autovacuum_stats"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_checkpoint_wal_config"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_performance_config"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_tables_needing_vacuum"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_wal_stats"() FROM anon;

-- Funções de trigger internas (não devem ser chamadas diretamente)
REVOKE ALL ON FUNCTION "public"."handle_new_company_config"() FROM anon;
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM anon;
REVOKE ALL ON FUNCTION "public"."notify_agendamentos_n8n"() FROM anon;
REVOKE ALL ON FUNCTION "public"."notify_n8n_pedido_status"() FROM anon;
REVOKE ALL ON FUNCTION "public"."update_companies_updated_at"() FROM anon;
REVOKE ALL ON FUNCTION "public"."update_pizza_extras_updated_at"() FROM anon;
REVOKE ALL ON FUNCTION "public"."update_settings_updated_at"() FROM anon;
REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM anon;

-- ============================================================
-- 4. CORRIGIR DEFAULT PRIVILEGES
--    O padrão atual concede ALL ON FUNCTIONS/TABLES a anon automaticamente.
--    Novo padrão: novas funções NÃO são concedidas a anon por default.
--    As funções explicitamente permitidas devem receber GRANT individual.
-- ============================================================
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON FUNCTIONS FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM anon;

-- ============================================================
-- 5. CORRIGIR RLS public_menu_company_read
--    A policy atual permite SELECT * (inclui cnpj, document, plan, settings).
--    Substituir por policy que restringe colunas visíveis via VIEW dedicada.
-- ============================================================

-- Remover policy permissiva existente
DROP POLICY IF EXISTS "public_menu_company_read" ON "public"."companies";

-- Criar VIEW segura com apenas os campos públicos do cardápio
CREATE OR REPLACE VIEW "public"."public_menu_companies" AS
  SELECT
    c.id,
    c.name,
    c.city,
    c.address,
    c.contact_phone,
    c.menu_banner_url,
    c.menu_logo_url,
    c.menu_primary_color,
    c.public_slug
  FROM public.companies c
  WHERE c.menu_published = true
    AND c.active = true
    AND c.public_slug IS NOT NULL;

-- A VIEW herda a segurança; conceder SELECT a anon apenas na VIEW
GRANT SELECT ON "public"."public_menu_companies" TO anon;
GRANT SELECT ON "public"."public_menu_companies" TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW "public"."public_menu_companies" IS
  'Vista pública segura para o cardápio QR. Expõe apenas campos não-sensíveis de empresas com menu publicado. Não expõe cnpj, document, plan, settings, contact_name, updated_by.';

-- ============================================================
-- 6. CORRIGIR get_company_by_menu_slug — adicionar SET search_path
--    SECURITY DEFINER sem SET search_path é vulnerável a search path injection
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."get_company_by_menu_slug"(slug_param text)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  address text,
  contact_phone text,
  menu_banner_url text,
  menu_logo_url text,
  menu_primary_color text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.city,
    c.address,
    c.contact_phone,
    c.menu_banner_url,
    c.menu_logo_url,
    c.menu_primary_color
  FROM public.companies c
  WHERE c.public_slug = slug_param
    AND c.menu_published = true
    AND c.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION "public"."get_company_by_menu_slug"(text) TO anon;
GRANT EXECUTE ON FUNCTION "public"."get_company_by_menu_slug"(text) TO authenticated;

-- ============================================================
-- 7. CONCEDER EXPLICITAMENTE apenas o necessário para cardápio anon
--    (princípio do menor privilégio para o fluxo público)
-- ============================================================

-- Permite anon chamar a função de busca por slug (já corrigida acima)
-- GRANT já aplicado em (6) acima

-- Manter acesso anon à função get_my_company_id e get_my_role apenas
-- para authenticated (não para anon, sem sessão não fazem sentido)
REVOKE ALL ON FUNCTION "public"."get_my_company_id"() FROM anon;
REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM anon;
REVOKE ALL ON FUNCTION "public"."is_admin_or_manager"() FROM anon;
REVOKE ALL ON FUNCTION "public"."user_in_company"("target_company_id" uuid) FROM anon;

-- ============================================================
-- 8. GARANTIR que public_menu_products_read usa LIMIT de auto-proteção
--    (policy existente OK, mas adicionar índice de suporte se ainda não existir)
-- ============================================================
-- Índice já criado na migration anterior; apenas garantir uso correto via EXPLAIN
-- Sem alteração estrutural necessária aqui.

-- ============================================================
-- VERIFICAÇÃO RÁPIDA DE SANIDADE (comentada — para revisão manual)
-- ============================================================
-- SELECT routine_name, routine_type, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'execute_sql','registrar_pagamento_comanda','close_cash_register',
--     'close_comanda','adicionar_consumo_atomico'
--   );
--
-- SELECT grantee, routine_name, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_schema = 'public'
--   AND grantee = 'anon'
-- ORDER BY routine_name;
