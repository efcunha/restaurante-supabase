-- =============================================================================
-- SQL Queries para Coleta de Evidências de Billing (26 mar)
-- Execução: Supabase Dashboard → SQL Editor → copiar/colar cada query
-- =============================================================================

-- ===========================================================================
-- SEÇÃO P: Pré-requisitos (Validações iniciais)
-- ===========================================================================

-- P2: Verificar definição de reconcile_billing_event_atomic (sem mp_payment_id)
-- EXEC TIME: ~1 sec
-- ESPERADO: Função deve conter JsonbBuildObject com detalhes SEM mp_payment_id

SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'reconcile_billing_event_atomic'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ===========================================================================
-- SEÇÃO S: Smoke Funcional (Durante execução)
-- ===========================================================================

-- S2: Procurar invoice criada nos últimos 5 minutos (após gerar PIX)
-- EXEC TIME: <1 sec
-- ESPERADO: Pelo menos 1 linha com status='pending' e payment_method='pix'

SELECT id, company_id, status, payment_method, created_at
FROM invoices
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 5;

---

-- S3a: Procurar cartão TEST armazenado (após cadastre cartão)
-- EXEC TIME: <1 sec
-- ESPERADO: 1 linha com card_last_four = últimos 4 dígitos (ex: 5682)

SELECT 
  id, 
  card_last_four, 
  card_brand, 
  company_id, 
  created_at
FROM payment_methods
WHERE company_id = (
  SELECT DISTINCT company_id 
  FROM invoices 
  ORDER BY created_at DESC 
  LIMIT 1
)
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 3;

---

-- S3b: Validar ausência de cartão completo em audit log (segurança)
-- EXEC TIME: <1 sec
-- ESPERADO: 0 linhas (nenhum vazamento de cartão ou CVV)

SELECT id, event_type, details, created_at
FROM billing_audit_log
WHERE company_id = (
  SELECT DISTINCT company_id 
  FROM invoices 
  ORDER BY created_at DESC 
  LIMIT 1
)
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND (
    details::text LIKE '%4235%'          -- Número completo do cartão TEST
    OR details::text LIKE '%123'          -- CVV
    OR details ? 'last_four'
    OR details ? 'card_token'
  )
ORDER BY created_at DESC;

---

-- S4a: Contar webhooks processados vs únicos (idempotência)
-- EXEC TIME: <1 sec
-- ESPERADO: COUNT(*) = COUNT(DISTINCT idempotency_key) (sem duplicação)

SELECT 
  COUNT(*) as total_webhooks,
  COUNT(DISTINCT idempotency_key) as unique_webhooks,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
  COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending
FROM webhook_events
WHERE event_type = 'payment.created'
  AND created_at > NOW() - INTERVAL '10 minutes';

---

-- S4b: Detalhe de webhooks processados (para auditoria)
-- EXEC TIME: <1 sec
-- ESPERADO: Todos com processed_at NOT NULL

SELECT 
  id, 
  idempotency_key, 
  event_type, 
  processed_at,
  created_at
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;

---

-- S5: Validar calls a billing_licenseGate (se houver logging)
-- EXEC TIME: <1 sec
-- ESPERADO: Logs de bloqueio/permissão de acesso por assinatura

SELECT 
  id, 
  company_id, 
  event_type,
  old_status,
  new_status,
  details,
  created_at
FROM billing_audit_log
WHERE event_type = 'license_gate'
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- ===========================================================================
-- SEÇÃO E: Evidências Finais (Após smoke completo)
-- ===========================================================================

-- E1: Transições coerentes de invoices (agregação por status)
-- EXEC TIME: <1 sec
-- ESPERADO: Apenas status válidos (pending, paid, failed, cancelled)

SELECT 
  status, 
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(updated_at) as last_updated,
  MIN(total_cents) as min_amount_cents,
  MAX(total_cents) as max_amount_cents
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;

---

-- E1b: Detalhe de invoices recentes para validação de transições
-- EXEC TIME: <1 sec
-- ESPERADO: Status coerentes, sem estados inválidos

SELECT 
  id, 
  company_id, 
  status, 
  payment_method, 
  total_cents, 
  created_at, 
  updated_at
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

---

-- E2: Webhook backlog zero (nenhum evento pendente >2h)
-- EXEC TIME: <1 sec
-- ESPERADO: Resultado = 0

SELECT COUNT(*) as unprocessed_count_2h
FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';

---

-- E2b: Detalhe de webhooks pendentes (se houver, para debug)
-- EXEC TIME: <1 sec
-- ESPERADO: 0 linhas (vazio)

SELECT 
  id, 
  provider, 
  event_type, 
  idempotency_key,
  created_at
FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at ASC
LIMIT 20;

---

-- E3: Ausência de campos sensíveis em audit log (24h)
-- EXEC TIME: <1 sec
-- ESPERADO: 0 linhas (nenhum vazamento)

SELECT 
  id, 
  event_type, 
  details,
  created_at
FROM billing_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (
    details ? 'mp_payment_id'
    OR details ? 'mp_card_id'
    OR details ? 'last_four'
    OR details ? 'card_token'
    OR details ? 'card_number'
  )
ORDER BY created_at DESC
LIMIT 20;

---

-- E3b: Resumo de campos presentes em audit log (segurança)
-- EXEC TIME: ~2 sec
-- ESPERADO: Sem campos sensíveis como mp_payment_id, card_number, etc.

SELECT 
  event_type,
  JSONB_OBJECT_KEYS(details) as field_name,
  COUNT(*) as occurrences
FROM billing_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, JSONB_OBJECT_KEYS(details)
ORDER BY event_type, field_name;

---

-- ===========================================================================
-- SEÇÃO M: Monitoramento (Pós-troca APP_USR — apenas se GO aprovado)
-- ===========================================================================

-- M1: Taxa de erro de billing_webhook (pós-troca)
-- EXEC TIME: <1 sec
-- ESPERADO: <1% (< COUNT(*) * 0.01)

SELECT 
  COUNT(*) as total_webhooks,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed_ok,
  COUNT(CASE WHEN processed_at IS NULL AND created_at < NOW() - INTERVAL '2 hours' THEN 1 END) as stale_pending
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND provider = 'mercadopago';

---

-- M2: Inadimplência (invoices failed)
-- EXEC TIME: <1 sec
-- ESPERADO: Tendência, não aumento anormal

SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_created,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at)
ORDER BY date DESC;

---

-- M3: Checkout performance (tempo de criação de invoice)
-- EXEC TIME: <1 sec
-- ESPERADO: Sem delays anormais (< 5 sec por transação)

SELECT 
  COUNT(*) as total_invoices,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_update_delay_sec,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_update_delay_sec
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ===========================================================================
-- NOTAS DE EXECUÇÃO
-- ===========================================================================

/*
1. Copie cada query (bloco acima da linha ---) em uma aba separada do SQL Editor
2. Execute conforme ordre das seções (P → S → E → M)
3. Registre resultados em SMOKE-TEST-26MAR-EXECUTION-PLAN.md
4. Se resultado divergir do esperado, marque [ ] FAIL e abra ação corretiva
5. Após E1-E3 completos: tome decisão GO/NO-GO
6. Se GO, proceder para FASE 4 (troca de secrets) e iniciar M1-M3 para monitoramento

Datas/horas de execução:
- Pré-requisitos (P): __________
- Smoke (S1-S5): __________
- Evidências (E1-E3): __________
- Decisão GO/NO-GO: __________

Responsável: __________
*/

-- =============================================================================
-- FIM DE QUERIES
-- =============================================================================
