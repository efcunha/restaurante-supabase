# Prompt de Continuacao - Maquininha TEF + Balanca (2026-04-07)

Use este prompt para retomar exatamente do ponto atual da implementacao.

## Contexto e escopo fixo

Projeto: restaurante-supabase
Fase atual: somente restaurante-web (frontend PDV) + restaurante-ops (backend)
Fora de escopo nesta fase: restaurante-app

Objetivo da fase:
- Maquininha TEF no PDV web integrada ao backend ops
- Backend ops integrado ao Hyperswitch (iniciacao, status e webhook)
- Fluxo de balanca mantido e validado no PDV web sem regressao

## O que ja foi implementado

1. Backend ops (estrutura principal pronta)
- Modulo de gateway criado: restaurante-ops/src/modules/payment-gateway.ts
- Testes do modulo criados: restaurante-ops/src/modules/payment-gateway.test.ts
- Variaveis de ambiente adicionadas: restaurante-ops/src/config/env.ts
- Rotas adicionadas em restaurante-ops/src/index.ts:
  - POST /payments/initiate
  - GET /payments/:transactionId/status
  - POST /webhooks/hyperswitch
- Validacao de assinatura de webhook HMAC implementada
- Modo simulacao suportado via PDV_DEVICE_SIMULATION

2. Banco de dados
- Migration principal criada e aplicada remotamente:
  - database-backup/migrations/20260407123000_create_payment_gateway_tables.sql
- Registro de reconciliacao de historico criado:
  - database-backup/migrations/20260407105516_create_payment_gateway_tables.sql
- Drift local/remoto de migrations foi zerado no check-migration-sync

3. Frontend web (PDV)
- Integracao de iniciacao de pagamento via ops em:
  - restaurante-web/src/features/pdv/services/devicePaymentService.ts
- Integracao de consulta de status via ops em:
  - restaurante-web/src/features/pdv/services/devicePaymentService.ts
- Polling de status ate estado final implementado em:
  - restaurante-web/src/features/pdv/hooks/useDevicePayment.ts
- Ajuste de mapeamento de status backend -> status de UI implementado
- Tipo atualizado para retorno com providerPaymentId em:
  - restaurante-web/src/features/pdv/types/index.ts
- PagamentoScreen ajustada para tratar processing sem falso erro

4. Documentacao da feature atualizada para escopo web+ops e balanca
- docs/maquininha/prompt-hyperswitch-restaurante.md
- docs/maquininha/README.md
- docs/maquininha/01-arquitetura-tecnica.md
- docs/maquininha/02-fluxos-tecnicos.md
- docs/maquininha/03-contratos-seguranca-observabilidade.md
- docs/maquininha/04-plano-execucao-testes-rollout.md

## Estado de validacao no momento da pausa

1. Ops
- npm test em restaurante-ops: passando (15/15)

2. Web
- Arquivos alterados de PDV sem erros locais no get_errors
- type-check completo do restaurante-web ainda falha por erros preexistentes e nao relacionados ao escopo da maquininha

3. Seguranca
- Snyk code scan indicou achados XSS preexistentes em restaurante-ops/src/index.ts
- Nesta fase foi decidido nao tratar XSS agora

## Decisoes importantes ja tomadas

1. Escopo desta fase e estritamente web+ops
2. Nao integrar restaurante-app agora
3. Nao chamar Hyperswitch diretamente no frontend; sempre via restaurante-ops
4. Manter fallback/simulacao por flags de ambiente

## Proximas acoes (ordem sugerida)

1. Criar teste unitario para polling do hook useDevicePayment
- Cobrir cenarios:
  - processing -> approved
  - processing -> declined
  - timeout apos janela configurada

2. Adicionar teste de integracao do endpoint de iniciacao com mock de resposta do gateway
- Foco em contrato e estados normalizados

3. Criar/ajustar E2E Playwright de fechamento com maquininha
- Cenario minimo:
  - iniciar pagamento
  - receber status final de sucesso
  - validar reflexo operacional no fluxo da comanda

4. Validar regressao do fluxo de balanca no PDV web
- Garantir que TEF nao impacta leitura de peso

## Prompt para continuar implementando (cole em nova sessao)

Continuar a implementacao da maquininha TEF no escopo restaurante-web + restaurante-ops (sem restaurante-app).

Contexto atual:
- Backend ops com modulo payment-gateway, rotas /payments/initiate, /payments/:transactionId/status e /webhooks/hyperswitch ja implementados.
- Frontend web com iniciacao + polling de status ja implementados em features/pdv.
- Migrations aplicadas e sincronizadas.
- Documentacao em docs/maquininha ja atualizada para escopo web+ops e balanca.

Tarefa agora:
1) Criar testes unitarios do polling em useDevicePayment.
2) Criar teste de integracao do endpoint /payments/initiate com mock do gateway.
3) Criar/atualizar E2E Playwright do fluxo de pagamento aprovado.
4) Validar que fluxo de balanca no PDV web segue funcional sem regressao.

Regras:
- Nao integrar restaurante-app nesta fase.
- Nao tratar XSS nesta fase.
- Manter tipagem estrita TypeScript.
- Manter abordagem segura (sem segredo no cliente, sem EXPO_PUBLIC para segredo).
