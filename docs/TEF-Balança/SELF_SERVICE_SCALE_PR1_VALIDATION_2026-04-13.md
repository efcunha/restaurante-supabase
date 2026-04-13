# Validacao PR1 - Self-Service Scale (2026-04-13)

Escopo desta etapa:
- Aplicar migration aditiva do fluxo self-service por peso.
- Validar regressao dos fluxos legados (Balcao, Mesa, Delivery).

## Inventario de artefatos PR1 (atualizado em 2026-04-13)

### Banco
- `database-backup/migrations/20260413194500_add_self_service_scale_flow_columns.sql`
- `database-backup/check-migration-sync.sh`

### Artefatos de apoio do contexto balanca/peso
- `database-backup/migrations/20260413120000_add_unit_and_weight_fields_to_products.sql`
- `database-backup/migrations/20260413120000_fix_cardapio_pesavel_categories.sql`
- `database-backup/migrations/20260413_fix_cardapio_pesavel_real.sql`

### Validacao de regressao executada
- `restaurante-web/e2e/balcao.spec.ts`
- `restaurante-web/e2e/mesa.spec.ts`
- `restaurante-web/e2e/mesa-consolidacao.spec.ts`
- `restaurante-web/e2e/mesa-concorrencia-garcons.spec.ts`
- `restaurante-web/e2e/delivery.spec.ts`

## 1) Migration aplicada

Arquivo local:
- database-backup/migrations/20260413194500_add_self_service_scale_flow_columns.sql

Aplicacao remota:
- project_id: ykalocfhnetxenvmtlcn
- Resultado: sucesso

Registro de historico remoto:
- versao 20260413194500 registrada em supabase_migrations.schema_migrations

## 2) Drift de migrations (estado atual)

Script executado:
- database-backup/check-migration-sync.sh

Resultado:
- Versao nova (20260413194500): sincronizada
- Drift preexistente ainda aberto:
  - Local nao registrada remotamente: 20260413120000
  - Remotas sem arquivo local: 20260413160842, 20260413175556

Observacao:
- Estes drifts nao foram introduzidos por esta migration e devem ser tratados em reconciliacao dedicada.

## 3) Regressao de fluxos legados em producao

Base URL:
- https://restaurante-web.app.br

### Balcao

Comando:
- npx playwright test e2e/balcao.spec.ts --workers=1 --reporter=line

Status final:
- 1 passed

Ajuste aplicado no teste:
- Robustez para variacao de modal de adicionais da Batata Frita.
- Restricao de clique no botao + ao item pesquisado (evita selecionar item errado e abrir modal de pesagem indevido).

### Mesa (critical)

Comando:
- npx playwright test e2e/mesa.spec.ts e2e/mesa-consolidacao.spec.ts e2e/mesa-concorrencia-garcons.spec.ts --workers=1 --reporter=line

Status:
- 3 passed

### Delivery

Comando:
- npx playwright test e2e/delivery.spec.ts --workers=1 --reporter=line

Status:
- 1 passed

Observacao:
- Console reportou erro de CORS para endpoint de logs do OPS durante Delivery, sem bloquear o fluxo funcional do teste.

## 4) Conclusao da etapa PR1

- Migration aditiva aplicada com sucesso.
- Fluxos legados validados verdes (Balcao, Mesa, Delivery).
- Etapa PR1 apta para consolidacao e avancar para PR2 (dominio/pipeline com feature flag default OFF).
