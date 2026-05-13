# Matriz de Mapeamento de Status

## Objetivo

Definir correspondencia entre status iFood e status internos para evitar ambiguidades operacionais.

## Mapeamento inicial sugerido

| Status iFood (referencial) | Status interno (`orders.status`) | Observacao |
|---|---|---|
| `PLACED` | `pending` | Pedido recebido, aguardando aceite interno |
| `CONFIRMED` | `preparing` | Pedido aceito e em preparo |
| `READY_TO_PICKUP` | `ready` | Pronto para retirada/entrega |
| `DISPATCHED` | `dispatched` | Saiu para entrega |
| `DELIVERED` | `delivered` | Entrega concluida |
| `CANCELLED` | `cancelled` | Cancelado; preservar trilha de auditoria |

## Regras

1. Nao sobrescrever estado terminal sem reconciliacao.
2. Em conflito de status, priorizar regra de seguranca operacional.
3. Mapear motivo de cancelamento quando disponivel.
