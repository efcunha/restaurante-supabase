# Backlog de Implementacao - Integracao iFood

## 1. Premissas

- backlog organizado por trilha tecnica
- prioridade P0/P1/P2
- itens com dependencia explicita

## 2. Trilha Backend/Ops

## P0

1. Criar endpoint `POST /webhooks/ifood` no `restaurante-ops`.
2. Implementar validacao de assinatura HMAC.
3. Implementar idempotencia por evento.
4. Registrar eventos em trilha de auditoria.

## P1

1. Criar endpoints outbound de status (accept/reject/ready/delivered).
2. Criar job de reconciliacao de status.
3. Criar endpoint de saude por empresa para integracao.

## P2

1. Automatizar replay de eventos com erro.
2. Criar dashboard operacional dedicado da integracao.

## 3. Trilha Banco/RLS

## P0

1. Criar migration para tabelas de provider/mapping/eventos.
2. Criar constraints de unicidade para idempotencia.
3. Aplicar RLS em todas as tabelas novas.
4. Validar `pg_policies` apos apply remoto.

## P1

1. Adicionar indices por `company_id` e data.
2. Otimizar consultas de reconciliacao.

## P2

1. Criar rotina de arquivamento de eventos antigos.

## 4. Trilha Web UX

## P0

1. Exibir badge de origem `ifood` no pedido.
2. Bloquear edicao de campos derivados do marketplace.
3. Exibir status de sincronizacao no detalhe do pedido.

## P1

1. Tela de diagnostico de sincronizacao por pedido.
2. Acoes manuais assistidas de reconciliacao.

## P2

1. Relatorios operacionais por canal externo.

## 5. Trilha Observabilidade

## P0

1. Definir logs estruturados sem PII.
2. Definir metricas de sucesso/erro/latencia.
3. Alertas para falha de webhook e fila de retry.

## P1

1. Dashboard por empresa e por tipo de evento.
2. Correlacao por `requestId` e `event_id`.

## P2

1. SLO formal com erro budget.

## 6. Testes obrigatorios

## P0

1. Testes unitarios de assinatura e idempotencia.
2. Testes de integracao do webhook inbound.
3. Testes E2E web para fluxo operacional com pedido externo simulado.

## P1

1. Testes de regressao para transicao de status bidirecional.
2. Testes de carga basicos no endpoint webhook.

## 7. Definition of Done por item

Cada item concluido deve ter:

- codigo + teste
- validacao de seguranca
- validacao de tenant isolation
- evidencia de observabilidade
- documentacao atualizada
