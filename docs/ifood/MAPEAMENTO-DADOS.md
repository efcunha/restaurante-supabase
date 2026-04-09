# Mapeamento de Dados - iFood x Dominio Interno

## 1. Objetivo

Mapear entidades e campos necessarios para suportar pedidos de marketplace com rastreabilidade e isolamento multi-tenant.

## 2. Entidades novas recomendadas

### delivery_providers

Armazena configuracao por empresa para provedores externos.

Campos base sugeridos:

- `id`
- `company_id`
- `provider_name` (ex.: `ifood`)
- `merchant_id`
- `is_enabled`
- `created_at`
- `updated_at`

### external_order_mapping

Relaciona pedido externo ao pedido interno.

Campos base sugeridos:

- `id`
- `company_id`
- `provider_name`
- `external_order_id`
- `internal_order_id`
- `external_status`
- `last_synced_at`

## 3. Campos recomendados em orders

Adicionar, quando necessario:

- `external_source` (ex.: `ifood`)
- `external_order_id`
- `external_status`
- `channel_metadata` (JSON controlado)

## 4. Eventos de webhook

Tabela recomendada (reuso ou extensao da existente):

- `provider`
- `event_id`
- `idempotency_key`
- `company_id`
- `received_at`
- `processed_at`
- `status`
- `error_message`
- `payload` (JSON)

## 5. Mapeamento de status

Ver matriz detalhada em [referencias/order-status-mapping.md](./referencias/order-status-mapping.md).

Regras essenciais:

1. Status externo nao substitui automaticamente estados internos invalidos.
2. Cancelamento deve preservar auditoria.
3. Entrega concluida precisa reconciliar pagamento/comanda.

## 6. Integridade e constraints

- unique (`provider_name`, `external_order_id`, `company_id`)
- fk `internal_order_id` -> `orders.id`
- not null para `company_id`
- indice por `company_id + received_at`

## 7. RLS minima

Para todas as tabelas de integracao:

- `USING (company_id = auth_company_id())`
- `WITH CHECK (company_id = auth_company_id())`

Obs.: funcao exata de resolucao de tenant deve seguir padrao ja adotado no projeto.
