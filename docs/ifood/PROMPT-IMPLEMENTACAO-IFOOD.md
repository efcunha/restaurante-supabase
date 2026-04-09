# PROMPT DE IMPLEMENTACAO - Integracao iFood

> Instrucao de uso: copie este prompt completo e envie para o agente que fara a implementacao. Nao remova as secoes de seguranca, multi-tenant e criterios de aceite.

## 1. Contexto do projeto

Voce esta implementando a integracao iFood no monorepo restaurante-supabase com os seguintes limites:

- `restaurante-ops` e o ponto de entrada para webhooks e orquestracao server-side.
- `restaurante-web` consome os dados integrados para operacao.
- Supabase e a persistencia principal com isolamento por `company_id` e RLS.
- Integracao iFood esta planejada (ainda nao implementada).

Guardrails obrigatorios:

- nunca hardcodar secrets
- validar assinatura em todo webhook inbound
- garantir idempotencia por evento
- manter trilha de auditoria
- preservar fluxos criticos: Balcao, Mesa, Delivery, Montagem
- manter segregacao multi-tenant em toda escrita/leitura

## 2. Objetivo da implementacao

Implementar o fluxo inicial de integracao iFood com:

1. Recepcao de eventos inbound por webhook assinado.
2. Persistencia segura e idempotente dos eventos.
3. Criacao/atualizacao de pedidos internos relacionados ao evento externo.
4. Exposicao de estado de sincronizacao no fluxo operacional.
5. Observabilidade, runbook e rollout canario para reduzir risco.

Fluxo alvo:

1. iFood envia evento para `POST /webhooks/ifood` no `restaurante-ops`.
2. Backend valida assinatura, schema minimo e idempotencia.
3. Backend resolve `company_id` por mapeamento de merchant confiavel.
4. Backend grava evento e aplica mutacao atomica no Supabase.
5. `restaurante-web` atualiza operacao por realtime/consulta.

## 3. Escopo tecnico por camada

### 3.1 Backend/Ops (restaurante-ops)

Implementar:

- rota `POST /webhooks/ifood`
- validacao de assinatura HMAC (comparacao segura)
- validacao de schema minimo do payload
- idempotencia por `provider + event_id`
- correlacao de logs por `request_id` e `event_id`
- respostas HTTP previsiveis (`200`, `202`, `400`, `401`, `409`, `503` quando aplicavel)

Regras:

- nunca confiar em `company_id` vindo livre no payload
- tenant deve ser resolvido por mapeamento `merchant_id -> company_id`
- operacoes de escrita devem ser atomicas
- logs sem PII em texto claro

### 3.2 Banco/Supabase

Implementar (via migration versionada):

- tabelas de provider/mapeamento/evento conforme docs de dados
- constraints de unicidade para idempotencia
- indices por `company_id` e tempo
- policies RLS em todas as tabelas novas

Workflow de migration (obrigatorio):

1. criar migration em `database-backup/migrations/`
2. aplicar no banco alvo na mesma sessao
3. validar registro em `supabase_migrations.schema_migrations`
4. validar policies em `pg_policies`

### 3.3 Web (restaurante-web)

Implementar ajustes de UX operacional:

- identificar origem externa do pedido (`ifood`)
- exibir status de sincronizacao no detalhe do pedido
- bloquear edicao de campos derivados do marketplace quando necessario
- manter sem regressao os fluxos de entrega/comanda/pagamento

### 3.4 Observabilidade e operacao

Implementar:

- logs estruturados sem PII
- metricas de sucesso, erro, latencia e backlog de retry
- alertas para falha de webhook e aumento de erros
- suporte a replay seguro de eventos com erro
- evidencias operacionais para troubleshooting

## 4. Contratos e mapeamento

Seguir como base:

- `docs/ifood/CONTRATOS-API.md`
- `docs/ifood/MAPEAMENTO-DADOS.md`
- `docs/ifood/referencias/order-status-mapping.md`
- `docs/ifood/referencias/webhook-payload-exemplo.md`

Regras de status:

- nao sobrescrever estado terminal sem reconciliacao
- cancelamento deve preservar trilha de auditoria
- entrega concluida deve reconciliar pagamento e fechamento de comanda

## 5. Checklist de seguranca obrigatorio

Use este bloco como gate antes de merge:

[ ] nenhum secret hardcoded no codigo novo
[ ] assinatura do webhook validada antes de processar payload
[ ] idempotencia garantida com unique constraint
[ ] `company_id` resolvido por mapeamento confiavel
[ ] RLS aplicada e validada remotamente
[ ] logs sem PII em texto claro
[ ] trilha de auditoria preservada
[ ] rate limiting e comportamento de falha definidos
[ ] LGPD revisada para dados pessoais de pedido

## 6. Testes minimos obrigatorios

1. Unitarios:
- validacao de assinatura
- idempotencia
- parser de payload

2. Integracao backend:
- webhook valido
- webhook com assinatura invalida
- webhook duplicado
- webhook com merchant sem mapeamento

3. E2E/operacional:
- pedido externo refletido no fluxo web
- transicao de status sem regressao de Delivery
- validacao de reconciliacao de entrega e pagamento

4. Smoke pos-deploy (mudanca sensivel):
- endpoint responde corretamente
- eventos processam sem tenant mixing
- alertas/metricas aparecem no painel

## 7. Rollout e rollback

Aplicar rollout progressivo por flags:

- `IFOOD_INBOUND_ENABLED`
- `IFOOD_OUTBOUND_ENABLED` (quando fase outbound existir)
- `EXPO_PUBLIC_FEATURE_IFOOD_UI_NEXT` (quando UI dedicada existir)

Fases:

1. piloto com 1 empresa
2. expandir para grupo pequeno
3. habilitar outbound parcial
4. escalar com gate por saude

Rollback:

- desabilitar flags
- manter endpoint em modo seguro
- registrar incidente e acao corretiva

## 8. Definition of Done (DoD)

A implementacao so termina quando:

- codigo com tipagem forte (sem `any` injustificado)
- migration criada/aplicada/registrada
- RLS validada em ambiente alvo
- testes minimos executados com evidencia
- smoke de mudanca sensivel executado
- documentacao atualizada
- sem hardcode de credenciais

## 9. Entregaveis esperados

1. Codigo backend no `restaurante-ops` para webhook iFood.
2. Migration(s) versionadas em `database-backup/migrations/`.
3. Ajustes de exibicao operacional no `restaurante-web`.
4. Testes unitarios/integracao/E2E necessarios.
5. Atualizacao de docs de contratos/runbook/rollout conforme implementacao real.

## 10. Referencias internas

- `docs/ifood/README.md`
- `docs/ifood/ARQUITETURA.md`
- `docs/ifood/CONTRATOS-API.md`
- `docs/ifood/MAPEAMENTO-DADOS.md`
- `docs/ifood/SEGURANCA-LGPD.md`
- `docs/ifood/OPERACAO-RUNBOOK.md`
- `docs/ifood/PLANO-ROLLOUT.md`
- `docs/ifood/BACKLOG-IMPLEMENTACAO.md`
- `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`
- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
