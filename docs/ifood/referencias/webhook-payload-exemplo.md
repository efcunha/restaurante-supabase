# Exemplo de Payload de Webhook (Referencial)

## Evento de pedido criado

```json
{
  "eventId": "evt_123",
  "eventType": "ORDER_PLACED",
  "merchantId": "merchant_abc",
  "order": {
    "externalOrderId": "ifood_order_999",
    "createdAt": "2026-04-09T12:00:00Z",
    "customer": {
      "name": "Cliente Exemplo",
      "phone": "+5511999999999"
    },
    "delivery": {
      "address": "Rua Exemplo, 123",
      "fee": 8.5
    },
    "items": [
      {
        "sku": "pizza-marguerita",
        "name": "Pizza Marguerita",
        "quantity": 1,
        "unitPrice": 49.9
      }
    ],
    "totals": {
      "gross": 58.4,
      "discount": 0,
      "net": 58.4
    }
  }
}
```

## Campos minimos para processamento interno

- `eventId`
- `eventType`
- `merchantId`
- `order.externalOrderId`
- `order.items`
- `order.totals`

## Observacoes

- payload acima e referencial para discussao tecnica
- schema final deve ser alinhado com documentacao oficial do iFood
