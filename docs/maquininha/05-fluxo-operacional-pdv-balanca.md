# Fluxo operacional PDV + balanca (para discussao)

## Objetivo

Definir um fluxo coerente para restaurante com dois modos de recebimento:

1. TEF integrado (transacao iniciada e confirmada pelo sistema)
2. Maquininha externa (transacao feita fora do TEF, com registro manual auditavel)

E integrar a balanca de forma segura, sem misturar responsabilidades entre consumo e pagamento.

## Problema operacional observado

No salao, o garcom pode receber na mesa com maquininha propria (sem TEF). Se o sistema assumir apenas TEF, o processo real quebra. Ao mesmo tempo, no cenario de venda por peso, a balanca altera o consumo, mas nao deve alterar o mecanismo de quitacao.

## Principios de desenho

1. Separacao de responsabilidade:
- Balanca calcula consumo
- Pagamento quita consumo

2. Fluxo dual de recebimento:
- Modo A: TEF integrado
- Modo B: Maquininha externa (manual)

3. Auditoria por padrao:
- Qualquer pagamento manual gera trilha de auditoria completa

4. Multi-tenant e seguranca:
- Toda operacao com company_id e validacao de permissao por funcao

5. Paridade operacional:
- Mesmo comportamento para mesa, balcao e self-service por quilo

## Personas e cenarios

1. Garcom (recebe na mesa):
- Pode usar maquininha externa
- Registra pagamento manual no sistema

2. Caixa:
- Pode usar TEF integrado no caixa
- Pode registrar externo quando necessario

3. Gerente/Admin:
- Pode estornar/cancelar pagamento
- Pode aprovar override (ex.: diferenca de valor)

## Fluxo alvo por etapa

## 1) Consumo

### Mesa/Balcao
- Itens adicionados a comanda
- Total consumido atualizado

### Por quilo (balanca)
- Peso estavel capturado
- Valor calculado por preco/kg
- Item pesado inserido na comanda com metadados de pesagem

Campos minimos sugeridos para item pesado:
- weight_kg
- price_per_kg
- measured_total
- scale_source (bridge/device)
- measured_at
- measured_by

## 2) Abertura de pagamento

Tela de pagamento da comanda apresenta:
- Saldo em aberto
- Valor a receber (total/parcial)
- Seletor de modo de recebimento:
  - TEF integrado
  - Maquininha externa

## 3) Modo A - TEF integrado

1. Operador escolhe valor e metodo
2. Sistema chama /payments/initiate
3. UI mostra status (processing)
4. Polling/status + webhook atualizam resultado
5. Em aprovado:
- registra pagamento
- atualiza saldo
- mantem trilha de reconciliacao

Regras:
- Nao baixar saldo definitivo em estado intermediario
- Idempotencia por transactionId/providerPaymentId

## 4) Modo B - Maquininha externa (manual auditavel)

1. Operador escolhe valor e confirma que recebeu fora do sistema
2. Formulario minimo:
- amount
- card_type (credito/debito/pix/cartao)
- nsu (opcional, recomendado)
- card_last4 (opcional)
- note (opcional)

3. Sistema registra pagamento manual com origem EXTERNAL_POS
4. Saldo da comanda e atualizado imediatamente
5. Evento de auditoria gravado

Regras:
- Estorno/cancelamento de pagamento manual: apenas gerente/admin
- Alteracao de valor pago apos confirmacao: sempre auditada
- Se amount < saldo aberto: manter comanda parcialmente aberta

## 5) Encerramento de comanda

Comanda so fecha automaticamente quando:
- open_balance <= 0
- sem pendencias operacionais de itens
- sem transacao TEF em estado processing

## 6) Guardrails de consistencia

1. Divergencia de valor:
- Se pagamento manual nao bate com saldo, exibir alerta e exigir confirmacao explicita

2. Duplo recebimento:
- Bloquear confirmacao manual para a mesma comanda/valor/janela curta com fingerprint de idempotencia

3. Integridade de status:
- Nao permitir regressao de estado final de pagamento

4. Permissoes:
- Garcom pode registrar recebimento
- Apenas gerente/admin pode estornar/cancelar

## 7) UX recomendada (web)

1. Componente PaymentModeSelector:
- TEF integrado
- Maquininha externa

2. Bloco TEF:
- Botao Iniciar maquininha
- Status em tempo real (aguardando/aprovado/negado)

3. Bloco Maquininha externa:
- Formulario curto e rapido (foco em velocidade de salao)
- Confirmacao com resumo antes de gravar

4. Bloco Balança:
- Leitura visivel de peso
- Confirmar peso antes de adicionar item
- Nao misturar com botao de pagamento

## 8) Modelo de dados (alto nivel)

Tabela de pagamentos (existente/estendida) deve diferenciar origem:
- payment_origin: TEF | EXTERNAL_POS | CASH | PIX
- gateway_transaction_id (nullable)
- provider_payment_id (nullable)
- external_reference_fields (nsu, card_last4)
- audit_metadata (json)

Para itens por peso:
- item_metadata.weight (json)
- ou colunas dedicadas no item de pedido

## 9) Observabilidade e auditoria

Eventos minimos:
- payment.initiated
- payment.processing
- payment.approved
- payment.declined
- payment.manual_recorded
- payment.reversed
- scale.weight_captured
- scale.weight_confirmed

Cada evento com:
- company_id
- comanda_number
- operator_id
- timestamp
- source (TEF, EXTERNAL_POS, SCALE)

## 10) Testes para validar o desenho

1. E2E mesa + maquininha externa:
- registrar pagamento manual parcial
- validar saldo parcial
- registrar restante
- validar fechamento

2. E2E caixa + TEF:
- iniciar TEF
- aprovar
- validar saldo e trilha

3. E2E por quilo + pagamento externo:
- capturar peso
- gerar item pesado
- quitar com maquininha externa

4. Regras de permissao:
- garcom nao estorna
- gerente estorna com auditoria

## 11) Decisoes abertas para discussao

1. NSU e card_last4 serao obrigatorios ou opcionais no modo externo?
2. Qual limite de tolerancia para diferenca entre valor recebido e saldo?
3. Fechamento automatico ou confirmacao manual ao zerar saldo?
4. Como tratar pagamentos mistos (parte TEF, parte externo) na UX?
5. Quais campos de balanca vao para item_metadata vs colunas dedicadas?

## 12) Proposta de rollout

1. Fase 1: liberar apenas registro manual externo (sem balanca nova)
2. Fase 2: liberar TEF integrado para grupo piloto
3. Fase 3: integrar balanca ao fluxo por quilo com testes E2E
4. Fase 4: endurecer regras de auditoria e politicas de estorno

---

Documento para discussao de produto + operacao + engenharia.
Nao substitui especificacao tecnica detalhada de API/DB.
