# 02 - Fluxos tecnicos de desenvolvimento

## 1. Fluxo principal (happy path)

### 1.1 Iniciacao

1. Operador seleciona comanda e valor no restaurante-web.
2. Frontend envia requisicao autenticada para endpoint de inicio de pagamento no restaurante-ops.
3. Backend valida sessao, permissao e company_id.
4. Backend recupera configuracao de gateway ativa da empresa.
5. Backend cria solicitacao no Hyperswitch para card_present.
6. Backend persiste transacao inicial como pending/processing.
7. Frontend recebe resposta inicial e exibe estado em andamento.

### 1.2 Confirmacao

1. Hyperswitch envia webhook de atualizacao de status.
2. Backend valida assinatura/origem do webhook.
3. Backend executa atualizacao idempotente da transacao.
4. Estado final e persistido como succeeded, failed ou cancelled.
5. Frontend consulta/refresha status e finaliza UX da operacao.

## 2. Fluxo de timeout

1. Frontend inicia pagamento e nao recebe confirmacao final no SLA definido.
2. UI marca estado como processing_timeout e habilita acao de reconsulta.
3. Backend nao cria nova cobranca automaticamente sem checagem idempotente.
4. Operador pode executar reconsulta de status por payment_id.
5. Fluxo encerra com estado real retornado pelo backend.

## 3. Fluxo de falha de adquirente

1. Hyperswitch retorna erro de processamento do adquirente.
2. Backend normaliza erro para codigo interno seguro.
3. Transacao e atualizada para failed.
4. Frontend exibe mensagem operacional sem dados sensiveis.
5. Operador escolhe repetir pagamento ou trocar forma de pagamento.

## 4. Fluxo de retry controlado

### Regra

Retry manual so e permitido quando:

- Estado atual e failed ou cancelled.
- Nao ha transacao succeeded para a mesma comanda/parcela.
- Operador confirma nova tentativa explicitamente.

### Sequencia

1. Frontend solicita nova tentativa.
2. Backend gera nova solicitacao com novo id de transacao.
3. Historico anterior permanece imutavel para auditoria.

## 5. Fluxo de idempotencia de webhook

1. Webhook chega ao backend com event_id.
2. Backend verifica se event_id ja foi processado.
3. Se sim, responde sucesso sem nova mutacao.
4. Se nao, aplica transicao de estado valida e registra processamento.

Regras de transicao recomendadas:

- Nao regredir succeeded para failed.
- Nao reabrir cancelled por evento tardio ambiguo.
- Nao aplicar o mesmo evento duas vezes.

## 6. Fluxo de reconciliacao operacional

1. Job de reconciliacao compara transacoes locais com estado do gateway.
2. Divergencias criticas geram alerta operacional.
3. Sistema corrige estado local quando permitido por regra de integridade.
4. Correcao gera trilha de auditoria com motivo e origem da reconciliacao.

## 7. Fluxo de indisponibilidade parcial

### Queda no restaurante-ops

- Frontend exibe indisponibilidade temporaria.
- Operador e orientado a usar fallback operacional definido.

### Queda no Hyperswitch

- Backend classifica erro como provider_unavailable.
- Frontend exibe erro recuperavel e sugere retry com intervalo.

### Queda de conectividade cliente

- Frontend preserva contexto da comanda.
- Operador nao perde dados da tela de pagamento.

## 8. Pontos de telemetria por fluxo

Eventos minimos:

- payment_initiated
- payment_processing
- payment_succeeded
- payment_failed
- payment_cancelled
- payment_timeout
- webhook_received
- webhook_idempotent_skip
- reconciliation_adjustment

Cada evento deve incluir:

- timestamp
- company_id mascarado/hash
- comanda_id
- payment_id
- status
- origem do evento (ui, api, webhook, reconciliation)
