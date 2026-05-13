# Plano seguro de rollout - self-service por peso (3 PRs)

Data: 2026-04-13
Objetivo: entregar fluxo de balanca para autoatendimento sem regressao em Comanda, Mesa e Delivery.

## Inventario consolidado de artefatos (atualizado em 2026-04-13)

### Documentacao desta trilha
- `docs/TEF-Balança/SELF_SERVICE_SCALE_SAFE_ROLLOUT_3PRS_2026-04-13.md`
- `docs/TEF-Balança/SELF_SERVICE_SCALE_PR1_VALIDATION_2026-04-13.md`
- `docs/TEF-Balança/SELF_SERVICE_SCALE_FLOW_BLUEPRINT_2026-04-13.md`
- `docs/TEF-Balança/PR3_VALIDACAO_SMOKE_TESTING_2026-04-13.md`
- `docs/TEF-Balança/INSTRUCOES.md`

### Banco e migrações
- `database-backup/migrations/20260413194500_add_self_service_scale_flow_columns.sql`
- `database-backup/migrations/20260413120000_add_unit_and_weight_fields_to_products.sql`
- `database-backup/migrations/20260413120000_fix_cardapio_pesavel_categories.sql`
- `database-backup/migrations/20260413_fix_cardapio_pesavel_real.sql`

### App/Web (implementacao funcional)
- `restaurante-web/src/hooks/useNovoPedido.ts`
- `restaurante-app/src/hooks/useNovoPedido.ts`
- `restaurante-web/src/screens/NovoPedidoScreen.tsx`
- `restaurante-app/src/screens/NovoPedidoScreen.tsx`
- `restaurante-web/src/services/OrderService.ts`
- `restaurante-app/src/services/OrderService.ts`
- `restaurante-web/src/services/OrderFirestoreService.ts`
- `restaurante-app/src/services/OrderFirestoreService.ts`
- `restaurante-web/src/services/ComandasService.ts`
- `restaurante-app/src/services/ComandasService.ts`
- `restaurante-web/src/screens/PedidosProntosScreen.tsx`
- `restaurante-app/src/screens/PedidosProntosScreen.tsx`
- `restaurante-web/src/config/featureFlags.ts`
- `restaurante-app/src/config/featureFlags.ts`
- `restaurante-web/src/types.ts`
- `restaurante-app/src/types.ts`

### PDV, balanca e simuladores
- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-web/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-web/src/features/pdv/components/BalancaDisplay.tsx`
- `restaurante-app/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-app/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-app/src/features/pdv/components/BalancaDisplay.tsx`
- `restaurante-web/src/features/dev-simulators/SimuladoresScreen.tsx`
- `restaurante-web/src/features/dev-simulators/components/ScaleSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/components/CardTerminalSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/types.ts`

### Testes E2E e gates
- `restaurante-web/e2e/pdv-scale-self-service.spec.ts`
- `restaurante-web/e2e/pdv-scale-novo-pedido-simulator.spec.ts`
- `restaurante-web/e2e/pdv-scale-regression.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-aprovado.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-validacao.spec.ts`
- `restaurante-web/e2e/balcao.spec.ts`
- `restaurante-web/e2e/mesa.spec.ts`
- `restaurante-web/e2e/mesa-consolidacao.spec.ts`
- `restaurante-web/e2e/mesa-concorrencia-garcons.spec.ts`
- `restaurante-web/e2e/delivery.spec.ts`

## Situacao atual em producao (snapshot de 2026-04-13)

- A infraestrutura base de balanca por peso ja existe em app/web, incluindo bridge e metadata de item por peso.
- O fluxo novo de self-service por peso foi implementado em banco + app + web, com flag dedicada `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE` default desligada.
- O fluxo self-service ainda nao esta promovido para uso geral em producao.
- A automacao E2E especifica do self-service validou apenas a infraestrutura de flags (`SS-00` passou); os cenarios operacionais ainda dependem de ambiente com produtos por peso e smoke manual controlado.
- Houve smoke de producao anterior do fluxo de balanca padrao com skip ao abrir `Pesagem assistida` no tenant avaliado por interferencia de `modalAdicionais=true`; portanto ainda nao ha evidencia suficiente para marcar o gate de producao controlada como concluido.
- O filtro para impedir exibicao desses pedidos em cozinha/montagem/prontos foi implementado em app/web; a pendencia restante para go-live saiu de codigo e ficou concentrada em validacao controlada de ambiente real.

## Principios de seguranca de rollout

- Mudancas apenas aditivas (sem quebrar comportamento legado).
- Feature flag dedicada com default desligado.
- Sem alterar contratos existentes de status usados por Comanda, Mesa e Delivery.
- Rollback por flag em segundos (sem rollback de schema em producao).

## Limitacao atual de cobertura

Nao existe spec E2E dedicada de Comanda no diretorio restaurante-web/e2e. Para reduzir risco:
- usar balcao + mesa como proxy de cobertura de comanda
- adicionar testes de pagamento/comanda no PR 3 (ou smoke manual guiado com evidencias)

## PR 1 - Banco aditivo e isolado

Status em 2026-04-13: concluido.

Escopo:
- Migration aditiva em orders/comandas para classificar origem e rota operacional do self-service.
- Nenhuma remocao/renomeio de colunas existentes.
- Nenhuma alteracao de constraints usadas pelos fluxos atuais.

Entregas:
- Novos campos com defaults seguros (comportamento legado preservado).
- Indices aditivos para filtros de origem/rota sem impacto em consultas atuais.
- RLS validada para manter isolamento por company_id.

Checklist de aceite PR 1:
- Migration aplicada e registrada em supabase_migrations.schema_migrations.
- Validacao remota em catalogo (pg_constraint, pg_policies, pg_indexes).
- Sem regressao de leitura/escrita para pedidos legados.

Rollback PR 1:
- Nao ativar feature flag do novo fluxo.
- Como schema e aditivo, sistema antigo segue funcional.

## PR 2 - Dominio e pipeline (web/app) com flag OFF

Status em 2026-04-13: concluido em codigo, mantido sob flag desligada em producao.

Escopo:
- Tipagem e servicos para suportar origem self-service.
- Pipeline de criacao de pedido/comanda reconhece novo tipo, mas apenas quando flag ligada.
- Regra de bypass de producao aplicada somente para nova origem.

Arquivos principais esperados:
- restaurante-web/src/services/OrderService.ts
- restaurante-web/src/context/OrderContext.tsx
- restaurante-web/src/hooks/useNovoPedido.ts
- restaurante-web/src/config/featureFlags.ts
- restaurante-app/src/services/OrderService.ts
- restaurante-app/src/context/OrderContext.tsx
- restaurante-app/src/hooks/useNovoPedido.ts
- restaurante-app/src/config/featureFlags.ts

Checklist de aceite PR 2:
- Flag nova criada (default false): EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE.
- Com flag false, fluxo legado identico ao atual.
- Com flag true, apenas pedidos de balanca entram na rota bypass_production.
- Nenhuma mudanca de comportamento em pedidos nao-balanca.

Rollback PR 2:
- Desligar EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE.

## PR 3 - UX de fechamento no posto + validacao E2E

Status em 2026-04-13: implementacao de codigo concluida; validacao operacional em producao ainda pendente.

Escopo:
- Tela/acao final de fechamento no posto da balanca:
  - pagamento imediato (TEF/external POS)
  - impressao para pagamento posterior
- Evidencias de regressao completa e smoke de producao.

Checklist de aceite PR 3:
- Fluxo self-service completo funcional em canary. Status atual: pendente apenas de ambiente real.
- Evidencias de TEF sucesso/falha e fallback operacional. Status atual: pendente.
- Operador consegue concluir venda sem acionar cozinha/montagem/despacho. Status atual: implementado em codigo; pendente validacao controlada em producao/canary.

Rollback PR 3:
- Desligar flag do fluxo self-service.
- Fluxos legados permanecem ativos sem alteracao.

## Gates de regressao obrigatorios por PR

## Gate A - Fluxos legados (Comanda/Mesa/Delivery)

Executar no restaurante-web:

- npx playwright test e2e/balcao.spec.ts --workers=1 --reporter=line
- npx playwright test e2e/mesa.spec.ts e2e/mesa-consolidacao.spec.ts e2e/mesa-concorrencia-garcons.spec.ts --workers=1 --reporter=line
- npx playwright test e2e/delivery.spec.ts --workers=1 --reporter=line

Criterio:
- 100% dos testes acima verdes antes de promover.

## Gate B - Fluxo novo (balanca)

- npx playwright test e2e/pdv-scale-novo-pedido-simulator.spec.ts --workers=1 --reporter=line
- npx playwright test e2e/pdv-scale-regression.spec.ts --workers=1 --reporter=line

Criterio:
- smoke + regressao verdes.

Status atual:
- `pdv-scale-self-service.spec.ts` criado.
- `SS-00` passou, validando infraestrutura de flags no browser.
- Gate B local ficou verde apos a implementacao do filtro operacional: 8 passed / 4 skipped.
- `SS-01..SS-04` permanecem skipped por precondicao de dados/tenant no ambiente de teste.

## Gate C - Pagamento presencial

- npx playwright test e2e/pdv-maquininha-aprovado.spec.ts --workers=1 --reporter=line
- npx playwright test e2e/pdv-maquininha-validacao.spec.ts --workers=1 --reporter=line

Criterio:
- fluxo de pagamento imediato sem regressao.

## Gate D - Producao controlada (canary)

Executar com base URL de producao, em janela controlada:
- smoke balanca
- regressao balanca
- 1 cenário de mesa
- 1 cenário de delivery

Criterio:
- sem erro bloqueante
- sem aumento anormal de falha de pagamento
- sem pedidos de balanca aparecendo em producao/cozinha/montagem

Status atual:
- nao executado/comprovado em ambiente real para o self-service.
- a pendencia funcional de filas operacionais foi resolvida em codigo; falta comprovar em canary/producao controlada.
- regressao automatizada local ficou majoritariamente verde, com vermelho residual de ambiente em `mesa-consolidacao.spec.ts` por falta de mesa livre no pool.

## Checklist operacional para go-live

- Flag habilitada apenas para empresa piloto.
- EXPO_PUBLIC_SCALE_BRIDGE_URL confirmada no ambiente.
- Bridge local ativo no posto de balanca.
- Procedimento de fallback manual validado com operador.
- Evidencias anexadas em tmp/evidencias (log + html + snapshot).

Status atual:
- checklist ainda nao fechado para producao do self-service.
- recomendacao: nao habilitar a flag de self-service em producao geral antes do Gate D + smoke manual + correcao do filtro operacional.

## Criterio de promocao de canary para geral

- 3 dias sem incidentes de cobranca/comanda.
- Sem regressao em Mesa e Delivery.
- Taxa de sucesso de pagamento dentro do baseline esperado.
- Auditoria de pagamentos sem duplicidade (idempotencia ok).
