# Blueprint tecnico - fluxo self-service por peso (balanca + PDV)

Data: 2026-04-13
Escopo: restaurante-app + restaurante-web + Supabase

## Inventario de artefatos implementados (atualizado em 2026-04-13)

### Banco
- `database-backup/migrations/20260413194500_add_self_service_scale_flow_columns.sql`
- `database-backup/migrations/20260413120000_add_unit_and_weight_fields_to_products.sql`
- `database-backup/migrations/20260413120000_fix_cardapio_pesavel_categories.sql`
- `database-backup/migrations/20260413_fix_cardapio_pesavel_real.sql`

### App / Web (dominio e UI)
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
- `restaurante-web/src/types.ts`
- `restaurante-app/src/types.ts`

### PDV / balanca / maquininha
- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-web/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-web/src/features/pdv/components/BalancaDisplay.tsx`
- `restaurante-app/src/features/pdv/services/scaleBridgeService.ts`
- `restaurante-app/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-app/src/features/pdv/components/BalancaDisplay.tsx`

### Simuladores DEV
- `restaurante-web/src/features/dev-simulators/SimuladoresScreen.tsx`
- `restaurante-web/src/features/dev-simulators/components/ScaleSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/components/CardTerminalSimulator.tsx`
- `restaurante-web/src/features/dev-simulators/types.ts`

### Testes E2E
- `restaurante-web/e2e/pdv-scale-self-service.spec.ts`
- `restaurante-web/e2e/pdv-scale-novo-pedido-simulator.spec.ts`
- `restaurante-web/e2e/pdv-scale-regression.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-aprovado.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-validacao.spec.ts`

## Status atual de implementacao (snapshot de 2026-04-13)

- Banco: colunas/migration do self-service aplicadas e registradas.
- Web/App: tipagem, fluxo de criacao, seletor de modo operacional e roteamento pos-criacao implementados.
- Feature flag: `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE` criada, default desligada.
- Validacao automatizada: infraestrutura E2E pronta; apenas o teste de flags (`SS-00`) foi comprovado no ambiente atual.
- Produção: self-service por peso ainda nao promovido para uso geral.
- O bypass das filas operacionais foi implementado em app/web; o gap remanescente ficou restrito a validacao controlada em ambiente real.

## Objetivo

Implementar um fluxo de autoatendimento por peso para linha de comida pronta, onde o atendimento nasce na balanca e nao entra em cozinha/montagem/despacho.

## Fluxo operacional alvo

1. Operador abre tela de balanca no PDV.
2. Cliente finaliza pesagem.
3. Sistema calcula valor automaticamente por kg.
4. Sistema cria comanda tecnica com origem self-service.
5. Encaminhamento de fechamento:
   - Pagamento imediato no posto (TEF ou maquininha externa)
   - Impressao de comanda para pagamento posterior no caixa
6. Pedido nao aparece nas filas de producao (cozinha/montagem/delivery).

Observacao de status:
- Os passos 1 a 5 ja possuem implementacao de codigo.
- O passo 6 continua como objetivo funcional e nao deve ser tratado como comportamento garantido em producao neste momento.

## Contexto atual observado

- Pesagem e metadata de item por peso ja existem no Novo Pedido.
- Bridge de balanca ja existe para web/app.
- Criacao de pedido ainda segue caminho geral de pedidos/comandas, agora com metadados de self-service quando a flag dedicada esta ligada.
- Fluxo de pagamento presencial (TEF e maquininha externa) ja existe na gestao de comandas.
- O fechamento no posto da balanca foi ligado ao Novo Pedido para navegar ao pagamento imediato ou imprimir comanda, conforme modo escolhido.
- Ainda nao existe evidencia de producao controlada suficiente para declarar o fluxo self-service como estabilizado em ambiente real.

## Contrato de dados proposto

### Tabela orders (novos campos)

- order_origin text not null default 'standard'
  - valores: 'standard' | 'self_service_scale'
- operational_route text not null default 'production'
  - valores: 'production' | 'bypass_production'
- service_point text null
  - ex.: 'balanca_01', 'balanca_salao'
- auto_generated_comanda boolean not null default false

### Tabela comandas (novos campos)

- comanda_origin text not null default 'standard'
  - valores: 'standard' | 'self_service_scale'
- payment_mode text not null default 'deferred'
  - valores: 'immediate' | 'deferred'
- closed_at_scale boolean not null default false

### Pagamentos (recomendacao de rastreabilidade)

Sem quebrar o modelo atual, incluir metadados por coluna dedicada ou json:
- payment_channel text: 'tef_integrado' | 'external_pos' | 'caixa'
- payment_correlation_id text (idempotencia operacional)

## Regras de negocio obrigatorias

1. Se order_origin='self_service_scale' e operational_route='bypass_production':
   - nao exibir em cozinha
   - nao exibir em montagem
   - nao exibir em despacho
2. Se pagamento imediato aprovado:
   - registrar pagamento
   - fechar comanda no mesmo fluxo
   - marcar closed_at_scale=true
3. Se pagamento posterior:
   - comanda permanece aberta/pendente de pagamento
   - impressao obrigatoria com identificador de comanda
4. Em falha de TEF:
   - nao perder comanda
   - permanecer no caminho de pagamento posterior
5. Multi-tenant:
   - toda leitura/escrita com company_id + RLS

Status atual das regras:
- Regras 1, 2, 3, 4 e 5 estao cobertas no banco/codigo atual.
- A validacao remanescente da Regra 1 passou a ser operacional, em ambiente real, e nao mais um gap de implementacao.

## Estados sugeridos para o fluxo de balanca

Estados de UX/operacao (nao substituir status global de producao):
- weighing
- priced
- pending_payment
- paid
- payment_deferred
- closed

## Pontos de alteracao no codigo

### Web

- Hook de montagem de itens por peso:
  - restaurante-web/src/hooks/useNovoPedido.ts
- Leitura da balanca/bridge:
  - restaurante-web/src/features/pdv/services/scaleBridgeService.ts
- Criacao de pedido/comanda (pipeline principal):
  - restaurante-web/src/context/OrderContext.tsx
  - restaurante-web/src/services/OrderService.ts
- Feature flags:
  - restaurante-web/src/config/featureFlags.ts
- Acoes de pagamento presencial em comanda:
  - restaurante-web/src/components/comandas/ComandaDetails.tsx

### App (paridade)

- restaurante-app/src/hooks/useNovoPedido.ts
- restaurante-app/src/features/pdv/services/scaleBridgeService.ts
- restaurante-app/src/context/OrderContext.tsx
- restaurante-app/src/services/OrderService.ts
- restaurante-app/src/config/featureFlags.ts

### Banco (migracoes)

- Criar migration em database-backup/migrations para novos campos/checks/indexes.
- Aplicar migration remotamente na mesma sessao.
- Validar registro em supabase_migrations.schema_migrations.

## Feature flag de rollout proposta

Adicionar flag dedicada para evitar regressao em fluxos existentes:
- EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE=true|false

Regras:
- false: comportamento atual preservado
- true: habilita origem/rota de self-service e bypass de producao

## E2E obrigatorio (matriz minima)

1. Pesagem automatica + pagamento TEF aprovado + fechamento imediato.
2. Pesagem automatica + TEF falha + fallback para comanda pendente.
3. Pesagem automatica + impressao para pagamento posterior.
4. Fallback manual de peso + pagamento imediato.
5. Fallback manual de peso + pagamento posterior.
6. Garantia de nao aparicao em cozinha/montagem/despacho.
7. Concorrencia/idempotencia (duplo clique em confirmar pagamento).
8. Isolamento multi-tenant (company_id).

## Gate de seguranca antes de producao

- Nenhum secret hardcoded.
- Validacao de input de peso (faixa minima/maxima por operacao).
- Idempotencia de pagamento com correlation id.
- Logs sem PII em texto claro.
- Evidencias de smoke e regressao no mesmo ciclo.

## Plano de execucao recomendado

1. Banco: migration + RLS/check constraints.
2. Dominio: campos novos em tipos e servicos Order/Comanda.
3. Web: ativar fluxo self-service por flag.
4. App: aplicar mesma semantica para paridade.
5. E2E: matriz minima + evidencias.
6. Go-live gradual por loja/operador.

## Criterio de pronto (DoD do fluxo)

- Fluxo completo de balanca operando sem criar backlog em producao.
- Pagamento imediato funcional no posto de balanca.
- Pagamento posterior com comanda impressa funcional.
- Rastreabilidade de pagamento e comanda auditavel.
- E2E critico verde em producao controlada.

Estado atual contra o DoD:
- Pagamento imediato: implementado em codigo, pendente validacao de producao controlada.
- Pagamento posterior com comanda: implementado em codigo, pendente validacao operacional em app/web reais.
- Rastreabilidade: campos/metadados introduzidos; auditoria operacional ainda depende do uso em canary.
- E2E critico: Gate B local verde, mas ainda nao verde ponta a ponta em ambiente real para self-service.
- Conclusao: blueprint implementado em codigo; nao considerar o fluxo pronto para promocao geral em producao antes do canary controlado.
