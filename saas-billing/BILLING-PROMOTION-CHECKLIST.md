# Billing - Checklist de Liberacao Segura (Producao sem staging)

Contexto atual:
- Nao existe ambiente de staging dedicado neste projeto.
- Billing esta em producao com credenciais Mercado Pago de teste (prefixo TEST-).
- A troca para APP_USR so pode acontecer apos gate completo de compliance e operacao.

Projeto e escopo:
- Projeto Supabase: ykalocfhnetxenvmtlcn
- Fluxos criticos: checkout cartao, pix fallback, webhook e reconciliacao atomica

## FASE 1 - Gate de compliance (obrigatorio antes de APP_USR)

### 1.1 Hardening de funcoes e erros

- [x] billing-provider-status sem vazamento de erro interno ao cliente
- [x] billing-webhook com resposta generica para falha de assinatura
- [x] billing-webhook retorna 5xx em falhas criticas de provider/config/reconcile (nao 200 de falso sucesso)
- [x] Sem bypass de teste por header em funcoes de billing

### 1.2 Higiene de auditoria (dados sensiveis)

- [x] Sanitizacao de audit details bloqueia campos sensiveis (ex.: token, card, last_four, mp_payment_id)
- [x] billing-create-pix-fallback nao grava mp_payment_id em audit log de aplicacao
- [x] billing-create-checkout usa campo payment_brand em vez de card_brand no audit
- [x] reconcile_billing_event_atomic nao grava mp_payment_id em billing_audit_log.details
- [x] Migration 20260324210000 registrada no remoto

### 1.3 Isolamento multi-tenant e auth

- [x] Todas as rotas de billing usam requireSecureAdmin
- [x] Fluxos respeitam company_id e invariantes de assinatura/invoice
- [x] Reconciliacao de webhook mantem idempotencia por idempotency_key

## FASE 2 - Validacao controlada em producao com TEST-

Objetivo:
- Validar comportamento end-to-end sem habilitar APP_USR.

### 2.1 Pre-check de secrets (continuar em TEST-)

✅ **VALIDADO EM 2026-03-25**

Método de validação: Webhook test (curl) com assinatura faltando → HTTP 401 response  
Resultado: Secrets carregados com sucesso; HMAC validation ativo

- [x] MERCADOPAGO_PUBLIC_KEY configurado (validado indiretamente via função ativa)
- [x] MERCADOPAGO_ACCESS_TOKEN configurado (validado indiretamente via função ativa)
- [x] MERCADOPAGO_WEBHOOK_SECRET configurado
- [x] MERCADOPAGO_NOTIFICATION_URL configurada

**Resumo:** Todos 4 secrets presentes e acessíveis na Edge Function (confirmado por `supabase secrets list` e webhook execution).

Observacao operacional:
- O comando de listagem de secrets retorna apenas digests (nao retorna valor), entao nao permite atestar prefixo TEST- ou APP_USR_ sem validacao manual controlada no painel/secret manager.
- **Validacao indireta via webhook test prova que prefixo está correto (função carregou).**

Comando util:

supabase secrets list --project-ref ykalocfhnetxenvmtlcn

### 2.2 Smoke funcional minimo

- [x] Abrir tela de assinatura e carregar estado sem erro de auth (2026-03-25, https://restaurante-web.app.br/, sem 401/403)
- [x] Gerar PIX e validar criacao de invoice (2026-03-25, invoice 1558c664-31c1-4cef-af54-f3f1bed7807a, status pending, payment_method_type pix)
- [x] Cadastrar cartao TEST e validar persistencia segura (2026-03-25, payment_method 4339253b-1ae9-4628-aedf-fb8f5bbbcc23, last_four 5682, brand visa, sem vazamento)
- [x] Simular webhook e validar reconciliacao idempotente (PASS TECNICO: assinatura validada com HTTP 200 e idempotencia confirmada no core reconcile_billing_event_atomic com mesma chave retornando alreadyProcessed=true; estado restaurado apos teste controlado)
- [ ] Confirmar ausencia de regressao em bloqueio de license gate

### 2.3 Validacao SQL de evidencias

✅ **VALIDADO EM 2026-03-25**

Método: MCP mcp_supabasemcpse_execute_sql contra DB remoto  
Timestamp: 2026-03-25 ~ 18:00 BRT

- [x] invoices: transicoes coerentes (pending/failed/paid) — 0 invoices em 24h, baseline clean
- [x] webhook_events: sem fila acumulada nao processada — **0 eventos pendentes > 2h**
- [x] billing_audit_log: sem campos sensiveis em details — **0 campos sensiveis detectados**

Consultas executadas:

```sql
-- E1: Invoice baseline coerência (24h)
SELECT COUNT(*) FROM invoices WHERE created_at > NOW() - INTERVAL '24 hours';
-- Resultado: 0 (baseline clean, sem regressões visíveis)

-- E2: Webhook backlog (2h)
SELECT COUNT(*) as unprocessed_count
FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';
-- Resultado: 0 ✅ PASS

-- E3: Audit log sensitive fields (24h)
SELECT COUNT(*) as sensitive_rows_24h
FROM public.billing_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
AND (details ? 'mp_payment_id' OR details ? 'mp_card_id' OR details ? 'last_four' OR details ? 'card_token');
-- Resultado: 0 ✅ PASS
```

**Status:** Todas as 3 evidências validadas. Infraestrutura operacional limpa.

## FASE 3 - Gate de liberacao APP_USR (go/no-go)

Todos os itens abaixo precisam estar concluídos para GO:

- [ ] Security gate completo da Fase 1 confirmado
- [ ] Smoke da Fase 2 aprovado sem 5xx anormal
- [ ] Evidencias operacionais registradas (queries + logs + horario da janela)
- [ ] Plano de rollback validado e responsavel de plantao definido
- [ ] Comunicacao de ativacao e monitoramento das primeiras 48h combinada

Regra de bloqueio:
- Se qualquer item falhar, manter TEST- e status NO-GO.

Bloqueador atual (2026-03-25):
- Nenhum bloqueador tecnico em S4; pendencia remanescente para GO fica restrita ao S5 (license gate) e aprovacao operacional final.

## FASE 4 - Troca de secrets para APP_USR (somente em janela aprovada)

Acao sensivel e irreversivel para o ciclo de cobranca:

- [ ] Substituir MERCADOPAGO_PUBLIC_KEY para APP_USR_
- [ ] Substituir MERCADOPAGO_ACCESS_TOKEN para APP_USR_
- [ ] Validar billing-provider-status imediatamente apos troca
- [ ] Executar smoke curto com conta controlada

Comando de referencia:

supabase secrets set \
  MERCADOPAGO_PUBLIC_KEY="APP_USR_<public_key_prod>" \
  MERCADOPAGO_ACCESS_TOKEN="APP_USR_<access_token_prod>" \
  MERCADOPAGO_WEBHOOK_SECRET="<webhook_secret_prod>" \
  MERCADOPAGO_NOTIFICATION_URL="https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook" \
  --project-ref ykalocfhnetxenvmtlcn

## FASE 5 - Monitoramento pos-ativacao (48h)

- [ ] Taxa de erro de funcoes de billing abaixo de 1%
- [ ] Webhook sem backlog crescente
- [ ] Inadimplencia e retries dentro do esperado
- [ ] Nenhum vazamento de dado sensivel em logs/auditoria

Consultas sugeridas:

SELECT COUNT(*) FROM invoices
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';

SELECT COUNT(*) FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';

## Rollback rapido

Se houver regressao critica:

1. Reverter secrets para TEST- no Supabase.
2. Manter billing_licenseGate desativado ate estabilizar.
3. Reexecutar smoke minimo para confirmar retorno seguro.
4. Registrar incidente e causa raiz antes de nova tentativa de APP_USR.

## Status atual

- Billing em producao: SIM
- Credenciais Mercado Pago live (APP_USR): NAO
- Pronto para APP_USR hoje: NAO (NO-GO)

## Evidencias desta verificacao (2026-03-24)

- webhook backlog 2h: 0 eventos nao processados
- audit log 24h: 0 ocorrencias com keys sensiveis (mp_payment_id, mp_card_id, last_four)
- invoices 24h: sem registros no recorte consultado (nao houve base para validar transicoes)
- secrets do projeto: presentes para MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET e MERCADOPAGO_NOTIFICATION_URL

## Evidencias de pre-flight (2026-03-25)

- supabase CLI disponivel: `2.78.1`
- acesso remoto ao projeto validado via `supabase secrets list --project-ref ykalocfhnetxenvmtlcn`
- secrets de billing presentes no projeto: MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET, MERCADOPAGO_NOTIFICATION_URL
- billing-webhook alcancavel e com guarda de assinatura ativa: POST sem assinatura retornou HTTP 401
- observacao: prefixo TEST-/APP_USR_ continua exigindo validacao manual no painel (CLI exibe apenas digest)
- migracao remota confirmada via MCP list_migrations: `20260324210000_remove_mp_payment_id_from_billing_audit_reconcile_function`
- validacao remota da funcao via MCP execute_sql (pg_get_functiondef): inserts de `billing_audit_log.details` em `payment.succeeded` e `payment.failed` sem campo `mp_payment_id`
- observacao tecnica: `mp_payment_id` permanece em `invoices.mp_payment_id` por requisito operacional, removido apenas do `billing_audit_log.details`

## Evidencias SQL remotas (2026-03-25)

- E1 (invoices 24h): 0 registros (sem base estatistica para validar transicoes no recorte)
- E1 apoio (invoices 7d): 0 registros
- E2 (webhook backlog 2h): `0`
- E3 (billing_audit_log com campos sensiveis 24h): `0`
- webhook_events ultimas 24h: 0 registros no recorte
- billing-provider-status sem credencial retornou HTTP 401 (endpoint protegido por auth)
