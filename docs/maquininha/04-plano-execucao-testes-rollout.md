# 04 - Plano de execucao, testes e rollout

Escopo desta fase: `restaurante-web` + `restaurante-ops`.
Fora de escopo desta fase (backend/gateway): `restaurante-app`.
Nota: restaurante-app recebeu simplificacao de UX PDV em 2026-04-07 (TEF removido, seletor lock aplicado).

Ultima atualizacao: **2026-04-08**

## 1. Roadmap por fases

### Fase 0 - Preparacao tecnica [CONCLUIDA]

- [x] Validar dependencias de arquitetura (ops, gateway, banco).
- [x] Confirmar politicas de seguranca e segredos.
- [x] Definir feature flags de controle.
- [x] Adicionar env vars PDV ao Railway restaurante-web.

### Fase 1 - Fundacao backend [CONCLUIDA]

- [x] Criar endpoints e contratos no restaurante-ops.
- [x] Implementar mapeamento de status canonicos.
- [x] Implementar idempotencia de webhook.
- [x] Criar migration payment_gateway_configs e payment_transactions (aplicada remotamente).
- [x] npm test ops: 15/15 passando.

### Fase 2 - Integracao frontend [PARCIALMENTE CONCLUIDA]

- [x] Integrar fluxo da UI de pagamento no restaurante-web (iniciacao + polling).
- [x] Simplificar UX: lock de modo, sem dinheiro no TEF, badge visual, auto-reset.
- [x] Deploy web publicado no Railway com as alteracoes.
- [ ] Integrar/validar fluxo de balanca no restaurante-web sem regressao.
- [ ] Exibir telemetria operacional (pendente).

### Fase 3 - Validacao controlada [PENDENTE]

- [ ] Testes unitarios do polling (useDevicePayment).
- [ ] Teste de integracao do endpoint /payments/initiate.
- [x] Smoke E2E web de fluxos criticos executado (balcao, mesa, pizza, delivery, mesa-consolidacao).
- [ ] E2E Playwright dedicado do fluxo PDV/maquininha aprovado.
- [ ] Smoke test de balanca no PDV web.
- [ ] Revisar criterios de go/no-go para producao.

## 8. Snapshot operacional (2026-04-08)

- Deploy do `restaurante-web` concluido em producao no Railway com healthcheck aprovado.
- Build Android `preview` do `restaurante-app` concluido no EAS.
- Gate TypeScript do `restaurante-app` reabilitado (type-check verde).
- Snyk Code Scan sem novos issues nos arquivos alterados da rodada de simplificacao PDV.

### Fase 4 - Rollout progressivo [PENDENTE]

- Wave 1: sandbox interno.
- Wave 2: grupo reduzido de restaurantes.
- Wave 3: disponibilidade geral monitorada.

## 2. Feature flags recomendadas

- FEATURE_PAYMENT_GATEWAY
- FEATURE_CARD_MACHINE
- FEATURE_PAYMENT_GATEWAY_SANDBOX

Regras:

- Flags com default seguro (desligado em producao).
- Mudanca de flag deve ser auditavel.
- Rollback deve ser imediato por toggle.

## 3. Plano de testes tecnicos

## 3.1 Unitarios (backend)

Cobrir:

- Mapeamento de estados externos para internos.
- Regras de transicao de estado.
- Validacao de payload de iniciacao.
- Deduplicacao de webhook por event_id.

## 3.2 Integracao (backend + gateway mock)

Cobrir:

- Criacao de pagamento com config valida.
- Falha por gateway nao configurado.
- Falha por indisponibilidade de provider.
- Reprocessamento idempotente de webhook.

## 3.3 E2E (fluxo critico)

Cenarios minimos:

1. Pagamento aprovado com fechamento correto de fluxo.
2. Pagamento recusado com mensagem operacional.
3. Timeout com reconsulta de status.
4. Retry manual apos falha sem duplicidade de sucesso.
5. Leitura de balanca estavel no PDV sem regressao do fluxo TEF.

## 3.4 Smoke tests de seguranca

- Validar ausencia de segredo no cliente.
- Validar bloqueio de acesso cross-company.
- Validar headers e CORS em endpoint sensivel.
- Validar que logs nao exibem PII/segredos.

## 4. Criterios de pronto (DoD tecnico)

- Contratos estabilizados e documentados.
- Telemetria e alertas ativos.
- Testes criticos aprovados.
- Rollback testado por feature flag.
- Evidencias de validacao registradas no ciclo.
- Fluxos de maquininha TEF e balanca funcionando no frontend web sem dependencia do restaurante-app.

## 5. Go/No-Go para producao

Go quando:

- Taxa de sucesso dentro da meta.
- Erro 5xx dentro do limite.
- Sem regressao em fluxos criticos de pagamento.

No-Go quando:

- Divergencia de reconciliacao sem mitigacao.
- Falhas de seguranca em checklist obrigatorio.
- Instabilidade recorrente de webhook sem fallback.

## 6. Plano de rollback

1. Desativar FEATURE_CARD_MACHINE.
2. Manter metodos legados de pagamento ativos.
3. Preservar trilha de auditoria das tentativas.
4. Abrir incidente com causa raiz e plano corretivo.

## 7. Evidencias minimas por release

- Lista de testes executados e resultado.
- Evidencia de logs/metricas do periodo de validacao.
- Registro de flags e janela de ativacao.
- Relatorio de incidente (se houver) com acao corretiva.
