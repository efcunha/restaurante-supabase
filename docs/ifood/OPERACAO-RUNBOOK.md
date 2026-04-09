# Operacao e Runbook - Integracao iFood

## 1. Objetivo

Padronizar operacao, monitoramento e resposta a incidentes da integracao iFood.

## 2. Sinais de saude

- ultimo webhook recebido por empresa
- taxa de erro por tipo de evento
- latencia de processamento
- quantidade de eventos em retry
- divergencia de status externo vs interno

## 3. Painel minimo recomendado

- eventos recebidos por minuto
- erros 4xx/5xx por endpoint
- top empresas com falhas recorrentes
- backlog de reprocessamento

## 4. Procedimentos operacionais

## 4.1 Webhook nao chega

1. Validar disponibilidade do endpoint no `restaurante-ops`.
2. Validar configuracao do webhook no painel iFood.
3. Verificar bloqueio por rede/firewall.
4. Verificar logs por `requestId`.

## 4.2 Evento chega mas nao aplica pedido/status

1. Verificar falha de assinatura.
2. Verificar falha de schema/payload.
3. Verificar idempotencia (evento ja processado).
4. Verificar erro de transacao no Supabase.

## 4.3 Tenant errado

1. Inspecionar mapeamento `merchant_id -> company_id`.
2. Auditar credenciais cadastradas para a empresa.
3. Pausar integracao da empresa ate correcao.

## 4.4 Divergencia de status

1. Identificar `external_order_id`.
2. Comparar status externo e interno.
3. Executar reconciliacao manual guiada.
4. Registrar incidente e causa raiz.

## 5. Reprocessamento

- permitir replay seguro de eventos com erro
- manter idempotencia no replay
- registrar usuario/automacao que disparou replay

## 6. Escalonamento

- severidade alta: impacto multi-tenant ou risco de PII
- severidade media: falha por empresa sem perda de dado
- severidade baixa: atraso sem impacto financeiro

## 7. Evidencias pos-incidente

- timeline resumida
- request ids afetados
- raiz tecnica
- acao corretiva
- acao preventiva
