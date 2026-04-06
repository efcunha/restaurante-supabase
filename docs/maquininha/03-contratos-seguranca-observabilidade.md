# 03 - Contratos, seguranca e observabilidade

## 1. Contrato tecnico de iniciacao de pagamento

## 1.1 Request (frontend -> ops)

Campos obrigatorios:

- comanda_id: string (UUID)
- amount_cents: number inteiro positivo
- payment_method: card_present
- correlation_id: string

Campos opcionais:

- description: string
- metadata: objeto com chaves permitidas por policy

Regras:

- amount_cents deve ser inteiro > 0.
- company_id nao deve ser confiado do payload quando usuario autenticado.
- correlation_id obrigatorio para rastreabilidade fim-a-fim.

## 1.2 Response inicial (ops -> frontend)

- payment_id: string
- status: pending | processing | succeeded | failed | cancelled
- next_action: none | await_terminal | await_webhook | retry_allowed
- created_at: ISO timestamp

## 2. Contrato tecnico de webhook (hyperswitch -> ops)

Campos minimos:

- event_id: string unico
- payment_id: string
- status: string externo do gateway
- event_time: ISO timestamp
- signature headers para validacao

Regras:

- Validar autenticidade antes de mutacao.
- Persistir event_id para idempotencia.
- Mapear status externo para estado canonico interno.

## 3. Matriz de erros padronizada

Codigos sugeridos:

- invalid_request
- unauthorized
- forbidden
- gateway_not_configured
- provider_unavailable
- processing_timeout
- payment_not_found
- conflict_state_transition
- internal_error

Resposta de erro segura:

- code
- message amigavel operacional
- correlation_id

Nao retornar stacktrace, segredos ou payload bruto de adquirente.

## 4. Seguranca obrigatoria

## 4.1 Multi-tenant e RLS

- Toda consulta deve considerar company_id.
- RLS deve impedir acesso entre empresas.
- company_id deve ser derivado da sessao autenticada.

## 4.2 Secrets management

- Sem hardcode de segredo no cliente.
- Sem segredos em EXPO_PUBLIC.
- Segredos apenas no backend/infra segura.

## 4.3 Protecoes de API

- Validacao estrita de payload (schema).
- Rate limiting por identidade e endpoint.
- CORS por allowlist sem wildcard em endpoint sensivel.

## 4.4 Logs seguros

- Mascarar dados sensiveis.
- Nao logar numero de cartao/CVV.
- Nao expor tokens e credenciais.

## 5. LGPD

- Coleta minima de dados pessoais.
- Retencao conforme necessidade legal/operacional.
- Acesso por menor privilegio.
- Auditoria de acessos a dados sensiveis.

## 6. Observabilidade tecnica

## 6.1 Correlacao

Usar correlation_id em:

- request inicial
- chamadas internas
- webhook
- reconciliacao
- logs e traces

## 6.2 SLOs operacionais sugeridos

- p95 iniciacao de pagamento <= 2.5s
- p99 processamento de webhook <= 1.5s
- erro 5xx mensal <= 0.5%

## 6.3 Dashboards minimos

- Taxa de sucesso por adquirente
- Tempo medio por etapa do fluxo
- Distribuicao de erros por codigo
- Divergencias de reconciliacao por periodo

## 6.4 Alertas minimos

- Aumento de failed acima do baseline
- Queda de webhook recebido
- Timeout acima do limite
- Reconciliacao com divergencia critica
