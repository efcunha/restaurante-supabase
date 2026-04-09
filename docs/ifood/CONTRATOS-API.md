# Contratos de API - Integracao iFood

## 1. Premissas

- Todos os endpoints abaixo sao planejados para o `restaurante-ops`.
- Contratos podem ser ajustados apos validacao com documentacao oficial do iFood.
- Qualquer endpoint sensivel deve exigir autenticacao e validacoes de seguranca.

## 2. Inbound - webhook iFood

### POST /webhooks/ifood

Recebe eventos de pedido/status originados no iFood.

Headers esperados (exemplo):

- `X-Ifood-Signature`: assinatura HMAC do payload
- `X-Ifood-Event-Id`: id unico do evento
- `Content-Type: application/json`

Resposta esperada:

- `200` quando evento for validado e aceito
- `202` quando processamento for assincrono
- `400` payload invalido
- `401` assinatura invalida
- `409` evento duplicado (idempotencia)

## 3. Outbound - callbacks para iFood (fase posterior)

### POST /integrations/ifood/orders/:externalOrderId/accept

Confirma aceite de pedido no canal externo.

### POST /integrations/ifood/orders/:externalOrderId/reject

Rejeita pedido com motivo operacional.

### POST /integrations/ifood/orders/:externalOrderId/ready

Informa que pedido esta pronto para retirada/entrega.

### POST /integrations/ifood/orders/:externalOrderId/delivered

Confirma entrega concluida para reconciliar status.

## 4. Endpoint de administracao interna

### GET /ops/integrations/ifood/company/:companyId/status

Retorna saude da integracao por empresa:

- conectividade
- ultimo webhook recebido
- eventos com erro
- fila de reprocessamento

## 5. Regras de validacao

1. Validar assinatura antes de parse semantico do evento.
2. Validar schema minimo do payload.
3. Validar tenant alvo por configuracao de merchant.
4. Registrar idempotencia antes da escrita principal.
5. Nunca confiar em identificador de tenant vindo livremente no payload.

## 6. Timeouts, retry e idempotencia

- timeout de resposta inbound: ate 5s para ack inicial
- processamento completo pode ser assincrono
- retries inbound devem ser suportados por `idempotency_key`
- deduplicacao por chave composta: `provider + event_id`

## 7. Exemplo de resposta padrao

```json
{
  "ok": true,
  "requestId": "req_123",
  "provider": "ifood",
  "alreadyProcessed": false
}
```

## 8. Relacao com contratos existentes

- manter padrao de erro JSON ja usado no `restaurante-ops`
- reaproveitar trilha de auditoria e webhook_events quando aplicavel
