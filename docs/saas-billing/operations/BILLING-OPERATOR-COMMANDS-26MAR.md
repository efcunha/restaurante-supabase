# Roteiro de Comandos — Operador de Plantão (26 mar)

**Objetivo:** Executar a janela de validação de billing com comandos em ordem real de uso, sem depender de montar comandos manualmente durante a operação.

**Plataforma alvo:** Windows / PowerShell  
**Projeto Supabase:** `ykalocfhnetxenvmtlcn`  
**Pasta de trabalho sugerida:** raiz do repositório `d:\restaurante-supabase`

---

## 1. Preparação de shell

Abra PowerShell na raiz do repositório e carregue as variáveis necessárias na sessão atual.

```powershell
Set-Location D:\restaurante-supabase

$env:SUPABASE_PROJECT_URL = "https://ykalocfhnetxenvmtlcn.supabase.co"
$env:SUPABASE_ANON_KEY = "<preencher_anon_key_do_projeto>"
$env:USER_JWT = "<preencher_jwt_valido_do_admin_da_empresa_de_teste>"
$env:WEBHOOK_SECRET = "<preencher_MERCADOPAGO_WEBHOOK_SECRET_atual>"
$env:PAYMENT_ID = "test-pay-001"
$env:BILLING_AUDIT_WINDOW_MINUTES = "60"
```

**Confirmação rápida:**

```powershell
Write-Host $env:SUPABASE_PROJECT_URL
Write-Host ($env:USER_JWT.Substring(0,20) + '...')
```

Se `USER_JWT` ou `WEBHOOK_SECRET` estiverem vazios, parar aqui.

---

## 2. Pré-check técnico rápido

Executa readiness das functions de billing e rejeição básica do webhook sem assinatura.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-smoke-test.ps1
```

**Esperado:**
- `billing-provider-status` sem erro 4xx/5xx inesperado
- `billing-create-checkout` sem erro 4xx/5xx inesperado
- `billing-create-pix-fallback` com `200` ou `409`
- `billing-webhook` sem assinatura retornando `401`

Se houver falha aqui, marcar `NO-GO` preliminar e investigar antes de abrir a janela funcional.

---

## 3. Teste explícito da camada de assinatura do webhook

Esse passo fecha P1 e revalida S4 no nível de segurança.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-webhook-test.ps1
```

**Esperado:**
- Test 1 unsigned: `401`
- Test 2 tampered signature: `401`
- Test 3 replay: `401`
- Test 4 valid signature: qualquer status diferente de `401`

---

## 4. SQL na ordem de uso durante a janela

Rodar no Supabase SQL Editor.

### 4.1 P2 — função sem campo sensível no audit details

```sql
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'reconcile_billing_event_atomic'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Esperado:** definição sem `mp_payment_id` dentro do JSONB `details`.

### 4.2 E1 — baseline de invoices

```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(updated_at) as last_updated
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;
```

### 4.3 E2 — backlog de webhook

```sql
SELECT COUNT(*) as unprocessed_count
FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';
```

### 4.4 E3 — audit log sem vazamento

```sql
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
```

---

## 5. S1 a S3 no produto

Esses passos são operados no navegador, mas as validações SQL abaixo devem ser usadas logo após a ação do usuário.

### S1 — tela de assinatura

Abra `https://restaurante-web.app.br/`, faça login com conta cliente TEST e confirme que a tela de billing abre sem `401/403`.

### S2 — após gerar PIX

```sql
SELECT id, company_id, status, payment_method_type, amount, pix_expires_at, created_at
FROM invoices
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

**Esperado:** invoice recente com `status='pending'` e `payment_method_type='pix'`.

### S3 — após salvar cartão TEST

```sql
SELECT id, last_four, brand, company_id, created_at
FROM payment_methods
WHERE company_id = (SELECT company_id FROM invoices ORDER BY created_at DESC LIMIT 1)
  AND created_at > NOW() - INTERVAL '60 minutes'
ORDER BY created_at DESC
LIMIT 3;
```

```sql
SELECT id, details
FROM billing_audit_log
WHERE company_id = (SELECT company_id FROM invoices ORDER BY created_at DESC LIMIT 1)
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND (details::text LIKE '%4235%' OR details::text LIKE '%last_four%')
ORDER BY created_at DESC;
```

**Esperado:** cartão persistido com `last_four` e `brand`, sem vazamento sensível em `billing_audit_log`.

---

## 6. S4 — idempotência / webhook

Se precisar revalidar rapidamente o estado das functions e do audit trail em uma sequência só:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-verify-all.ps1
```

Para checagem SQL de duplicação:

```sql
SELECT 
  COUNT(*) as total_webhooks,
  COUNT(DISTINCT idempotency_key) as unique_webhooks,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
  COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending
FROM webhook_events
WHERE event_type = 'payment.created'
  AND created_at > NOW() - INTERVAL '10 minutes';
```

**Esperado:** `total_webhooks = unique_webhooks`.

---

## 7. S5 — license gate

**Importante:** não usar `EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK=true` como evidência de produção. Esse flag é útil para QA local, mas não fecha gate real.

Validação operacional:

1. usar empresa/usuário sem assinatura ativa e confirmar bloqueio
2. usar empresa/usuário elegível e confirmar acesso permitido
3. registrar screenshot e horário

Se existir log de `license_gate`, rodar:

```sql
SELECT id, company_id, event_type, old_status, new_status, details, created_at
FROM billing_audit_log
WHERE event_type = 'license_gate'
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 8. Checagem final de audit trail

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-audit-check.ps1
```

**Esperado:** encontrar `billing.checkout.requested` e `billing.pix.requested` na janela selecionada.

---

## 9. Se GO, preparar mas não executar antes da aprovação final

Comando de promoção de secrets para APP_USR, apenas após decisão formal:

```powershell
supabase secrets set `
  MERCADOPAGO_PUBLIC_KEY="APP_USR_<valor_production_public_key>" `
  MERCADOPAGO_ACCESS_TOKEN="APP_USR_<valor_production_access_token>" `
  MERCADOPAGO_WEBHOOK_SECRET="<valor_production_webhook_secret>" `
  MERCADOPAGO_NOTIFICATION_URL="https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook" `
  --project-ref ykalocfhnetxenvmtlcn
```

Depois da troca, rodar health-check curto:

```powershell
curl.exe https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-provider-status
```

---

## 10. Critério rápido de parada

Parar imediatamente e registrar `NO-GO` se ocorrer qualquer um abaixo:

- erro `5xx` inesperado em function crítica
- `billing-webhook` aceitar request sem assinatura válida
- divergência entre UI e estado persistido no banco
- vazamento sensível em `billing_audit_log`
- evidência insuficiente para um teste marcado como PASS

---

## 11. Arquivos que o operador deve manter abertos

- `saas-billing/operations/SMOKE-TEST-26MAR-EXECUTION-PLAN.md`
- `saas-billing/operations/BILLING-GO-NO-GO-CHECKLIST-26MAR.md`
- `saas-billing/operations/BILLING-OPERATOR-COMMANDS-26MAR.md`
- `saas-billing/operations/SQL-QUERIES-EVIDENCE-COLLECTION.sql`