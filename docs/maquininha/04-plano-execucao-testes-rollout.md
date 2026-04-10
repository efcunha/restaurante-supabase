# 04 - Plano de execucao, testes e rollout

Escopo desta fase: `restaurante-web` + `restaurante-ops`.
Fora de escopo desta fase (backend/gateway): `restaurante-app`.
Nota: restaurante-app recebeu simplificacao de UX PDV em 2026-04-07 (TEF removido, seletor lock aplicado).

Ultima atualizacao: **2026-04-10**

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
- [x] Registrar pagamento automaticamente apos aprovacao da maquininha no web, com fallback manual supervisionado em caso de erro de registro.
- [x] Deploy web publicado no Railway com as alteracoes.
- [ ] Integrar/validar fluxo de balanca no restaurante-web sem regressao.
- [ ] Exibir telemetria operacional (pendente).

### Fase 3 - Validacao controlada [PENDENTE]

- [x] Cobertura automatizada inicial do polling implementada (`pdv-device-payment-polling.spec.ts`).
- [x] Cobertura MOCK_AUTO de iniciacao TEF para erro de endpoint, env ausente e feature flag (`pdv-device-payment-service.spec.ts`).
- [x] Cobertura MOCK_AUTO de balanca para leitura instavel, erro inesperado e feature flag desligada (`pdv-scale-regression.spec.ts`).
- [ ] Teste de integracao do endpoint /payments/initiate.
- [~] Teste de integracao do endpoint /payments/initiate em `INT_REAL`: response real obtida em `POST /payments/initiate` com `404` e `code=gateway_not_configured` para o tenant autenticado.
- [x] Hardening CORS aplicado e publicado no `restaurante-ops` (origem canônica web permitida + localhost apenas fora de producao), com preflight validado.
- [~] Pre-requisitos remanescentes para aprovar `TEF-11`: (1) cadastrar/ativar `payment_gateway_configs` no tenant autenticado; (2) garantir credenciais server-side de gateway (Hyperswitch) ou simulação controlada para retorno `processing`.
- [~] Progresso de desbloqueio `TEF-11`: `payment_gateway_configs` ativo criado para tenant do E2E; resposta evoluiu de `404 gateway_not_configured` para `503` server-side. Proximo passo: credenciais Hyperswitch ou `PDV_DEVICE_SIMULATION=true` em ambiente controlado.
- [x] `TEF-11` validado em `INT_REAL` com response real `202` e payload `status=processing` no endpoint `/payments/initiate` (simulação controlada ativa no `restaurante-ops`).
- [x] Validacao `INT_REAL` concluida para `TEF-12`/`TEF-13` (transicao `processing -> succeeded` e timeout operacional com evidencia de polling/status).
- [x] Smoke E2E web de fluxos criticos executado (balcao, mesa, pizza, delivery, mesa-consolidacao).
- [x] E2E Playwright dedicado do fluxo PDV/maquininha aprovado (modo controlado com mocks de endpoints PDV).
- [ ] Smoke test de balanca no PDV web.
- [x] Proxima validacao `INT_REAL`: `TEF-14`/`TEF-15` (retry sem duplicidade e bloqueio por saldo/comanda invalida).
- [x] Rodada 2026-04-10 (tarde): deploy via Railway CLI tentado e bloqueado por `Invalid RAILWAY_TOKEN`; health do ops validado em producao (`/healthz` e `/api/status` com HTTP 200).
- [x] Rodada 2026-04-10 (tarde): credenciais carregadas dos `.env` locais e suite executada com sucesso em tenant real.
- [x] Evidencias TEF-14/15 coletadas: TEF-14 (`202` + mesmo `transactionId`) e TEF-15a/TEF-15b (`400`).
- [ ] Revisar criterios de go/no-go para producao.

## 8. Snapshot operacional (2026-04-08)

- Deploy do `restaurante-web` concluido em producao no Railway com healthcheck aprovado.
- Build Android `preview` do `restaurante-app` concluido no EAS.
- Gate TypeScript do `restaurante-app` reabilitado (type-check verde).
- Snyk Code Scan sem novos issues nos arquivos alterados da rodada de simplificacao PDV.
- Matriz de homologacao TEF + balanca documentada para guiar a validacao controlada da proxima rodada.

### Fase 4 - Rollout progressivo [PENDENTE]

- Wave 1: sandbox interno.
- Wave 2: grupo reduzido de restaurantes.
- Wave 3: disponibilidade geral monitorada.

## 2. Feature flags recomendadas

- `EXPO_PUBLIC_FEATURE_PDV_ENABLED`
- `EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT`
- `EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS`
- `EXPO_PUBLIC_FEATURE_PDV_SCALE`

Regras:

- Flags com default seguro (desligado em producao).
- Mudanca de flag deve ser auditavel.
- Rollback deve ser imediato por toggle.
- Para homologacao, usar `06-matriz-homologacao-tef-balanca.md` para distinguir `SIM_LOCAL`, `MOCK_AUTO` e `INT_REAL`.

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
