# Runbook - Cutover de Observabilidade Isolada

## Objetivo

Migrar o armazenamento de logs de um modelo compartilhado para um banco de observabilidade isolado, sem downtime, preservando rastreabilidade e performance.

## Escopo

- Origem: pipeline atual de logs no restaurante-ops.
- Destino: projeto Supabase dedicado para observabilidade.
- Artefatos: `ops_logs`, `ops_alerts`, `ops_alert_firings`, dashboard de consulta, engine de alertas.

## Pre-requisitos

- Projeto Supabase de observabilidade criado.
- Secrets configurados no Railway para `OBS_SUPABASE_URL` e `OBS_SUPABASE_SERVICE_ROLE_KEY`.
- Migration oficial aplicada no destino:
   - `database-backup/migrations/20260405184919_create_observability_isolated_partitioned_logs.sql`
- Feature flags disponíveis no ops:
  - `OBS_DUAL_WRITE`
  - `OBS_READ_FROM_ISOLATED`
- Monitoramento do próprio pipeline habilitado (lag de flush, taxa de erro de insert, tamanho de buffer).

## Checklist de Segurança

- [ ] Service role do banco isolado usado apenas no backend ops.
- [ ] Endpoint `POST /api/logs` protegido por API key e rate limiting.
- [ ] Webhooks externos protegidos por `X-Webhook-Secret`.
- [ ] Redaction validada para token/secret/password/cookie/authorization/api_key/service_role/card/cvv/pix_qr/cpf/phone.
- [ ] Dados de PII mascarados nos logs exibidos no dashboard.

## Fase 0 - Baseline

1. Coletar baseline de 24h antes da migração:
   - total de logs por nível (`info`, `warn`, `error`)
   - erro por serviço
   - p95 de query do dashboard
   - p95 ingest-to-persist
2. Documentar baseline em `docs/security/` ou pasta operacional equivalente.

Critério de baseline:
- Sem degradação conhecida ativa no ambiente no momento da medição.

## Fase 1 - Provisionamento

1. Aplicar schema no banco isolado (tabelas e índices).
2. Validar permissões/RLS no destino.
3. Configurar limpeza/retenção (`LOG_RETENTION_DAYS`) e export cold storage.
4. Publicar versão do ops com suporte a destino isolado, sem ativar uso ainda.

Validação:
- Healthcheck do ops em estado verde.
- Inserção manual de log de teste no destino com retorno bem-sucedido.

Comandos sugeridos (executar no contexto do projeto isolado):

```bash
# Exemplo de fluxo com Supabase CLI
cd database-backup/supabase
supabase migration list
supabase db push
```

Validação SQL mínima:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
   AND tablename IN ('ops_logs', 'ops_alerts', 'ops_alert_firings')
ORDER BY tablename, policyname;
```

## Fase 2 - Dual-write

1. Ativar `OBS_DUAL_WRITE=true`.
2. Manter leitura do dashboard no storage antigo (`OBS_READ_FROM_ISOLATED=false`).
3. Rodar por janela de observação (recomendado: 24-72h).

Validações contínuas:
- Divergência de contagem por nível em janelas de 1h e 24h.
- Integridade de trace por `request_id` e `order_id`.
- Perda de `error` deve ser zero.

Critérios para avançar:
- Divergência total em 24h < 0.5%.
- Perda de logs `error` = 0.
- p95 ingest-to-persist <= 3s.

## Fase 3 - Read switch

1. Ativar `OBS_READ_FROM_ISOLATED=true`.
2. Manter `OBS_DUAL_WRITE=true` por segurança durante soak period (6-24h).
3. Validar dashboard completo:
   - listagem com filtros
   - métricas agregadas
   - trace por request
   - trace por order
   - alertas

Critério de estabilidade:
- p95 de query do dashboard no isolado nao piora > 30% por 30 minutos.

## Fase 4 - Finalização

1. Desativar escrita no legado (`OBS_DUAL_WRITE=false`).
2. Manter fallback configurado por 7 dias (sem uso ativo).
3. Congelar schema legado para evitar drift.
4. Registrar evidências finais do cutover.

## Plano de Rollback

Gatilhos de rollback imediato:
- Queda de logs `error` no destino.
- Falha persistente em ingestao no isolado.
- Regressao severa de dashboard/alertas.

Passos:
1. `OBS_READ_FROM_ISOLATED=false`
2. `OBS_DUAL_WRITE=false` (ou manter true apenas temporariamente para diagnostico)
3. Reiniciar serviço do ops.
4. Abrir incidente e anexar métricas de buffer/erros de flush.

## Evidências mínimas para encerramento

- Comparativo de contagem legado vs isolado (1h, 24h).
- Evidência de zero perda em `error`.
- Capturas de tela do dashboard no isolado.
- Resultado dos smoke tests de logs e alertas.
- Registro de mudança com horário do cutover e flags utilizadas.

## Smoke tests recomendados

1. Emitir `order_created` e confirmar presença em <= 10s.
2. Emitir `payment_failed` e validar alerta.
3. Consultar trace por `request_id` contendo eventos de web -> ops -> activepieces/evolution.
4. Forçar erro de webhook e validar `webhook_failed`.
5. Validar redaction com payload contendo token/cpf/phone.
