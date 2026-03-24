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

- [ ] Confirmar MERCADOPAGO_PUBLIC_KEY com prefixo TEST-
- [ ] Confirmar MERCADOPAGO_ACCESS_TOKEN com prefixo TEST-
- [ ] Confirmar MERCADOPAGO_WEBHOOK_SECRET configurado
- [ ] Confirmar MERCADOPAGO_NOTIFICATION_URL apontando para billing-webhook

Comando util:

supabase secrets list --project-ref ykalocfhnetxenvmtlcn

### 2.2 Smoke funcional minimo

- [ ] Abrir tela de assinatura e carregar estado sem erro de auth
- [ ] Gerar PIX e validar criacao de invoice
- [ ] Cadastrar cartao TEST e validar persistencia segura
- [ ] Simular webhook e validar reconciliacao idempotente
- [ ] Confirmar ausencia de regressao em bloqueio de license gate

### 2.3 Validacao SQL de evidencias

- [ ] invoices: transicoes coerentes (pending/failed/paid)
- [ ] webhook_events: sem fila acumulada nao processada
- [ ] billing_audit_log: sem campos sensiveis em details

Consultas sugeridas:

SELECT COUNT(*) FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';

SELECT id, event_type, details
FROM billing_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (
    details ? 'mp_payment_id'
    OR details ? 'mp_card_id'
    OR details ? 'last_four'
  )
LIMIT 20;

## FASE 3 - Gate de liberacao APP_USR (go/no-go)

Todos os itens abaixo precisam estar concluídos para GO:

- [ ] Security gate completo da Fase 1 confirmado
- [ ] Smoke da Fase 2 aprovado sem 5xx anormal
- [ ] Evidencias operacionais registradas (queries + logs + horario da janela)
- [ ] Plano de rollback validado e responsavel de plantao definido
- [ ] Comunicacao de ativacao e monitoramento das primeiras 48h combinada

Regra de bloqueio:
- Se qualquer item falhar, manter TEST- e status NO-GO.

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
- Pronto para APP_USR hoje: pendente de gate final Fase 2 e aprovacao GO/NO-GO
