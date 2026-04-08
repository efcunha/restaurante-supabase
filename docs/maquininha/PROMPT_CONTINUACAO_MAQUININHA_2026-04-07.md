# Prompt de Continuacao - Maquininha TEF + Balanca (2026-04-07)

Use este prompt para retomar exatamente do ponto atual da implementacao.

## Contexto e escopo fixo

Projeto: restaurante-supabase
Fase atual: somente restaurante-web (frontend PDV) + restaurante-ops (backend)
Fora de escopo desta fase (backend/gateway): restaurante-app
Nota: restaurante-app recebeu simplificacao de UX PDV nesta data (ver secao abaixo)

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

4. UX de pagamento simplificada — web (sessao da tarde 2026-04-07)

Arquivo alterado: restaurante-web/src/features/payments/components/PaymentActionPanel.tsx

- tefPaymentMethods = ['pix', 'cartao_credito', 'cartao_debito'] — sem dinheiro no fluxo TEF
- Lock logic adicionada:
  - isTefFlowLocked = initialMode === 'tef' && showDevicePaymentAction
  - isExternalFlowLocked = initialMode === 'external_pos' && showExternalPosOption
  - isModeLocked = isTefFlowLocked || isExternalFlowLocked
  - showModeSelector ocultado quando isModeLocked (elimina seletor redundante)
- effectivePaymentMode = isModeLocked ? initialMode : paymentMode
- methodsForCurrentMode usa tefPaymentMethods quando modo efetivo for 'tef'
- Badge visual contextual (modeLockLabel):
  - 'tef' exibe "Fluxo TEF Integrado"
  - 'external_pos' exibe "Fluxo Maquininha Externa"
- useEffect auto-reset: ao entrar em TEF com forma === 'dinheiro', reseta para 'cartao_debito'

5. UX de pagamento simplificada — app mobile (sessao da tarde 2026-04-07)
   (fora do escopo de backend/gateway, mas registrado para rastreabilidade)

Arquivos alterados:
- restaurante-app/src/components/comandas/ComandaDetails.tsx
  - Removido botao "TEF INTEGRADO" (mobile nao usa TEF integrado)
  - Mantido apenas botao "MAQUININHA EXTERNA" condicionado a externalPosEnabled
  - Tipo onOpenPdvMode restrito a 'external_pos'
- restaurante-app/src/features/payments/types.ts
  - PaymentMode = 'normal' | 'external_pos' (removido 'tef')
- restaurante-app/src/features/payments/components/PaymentModeSelector.tsx
  - Removida prop showTef e opcao TEF
- restaurante-app/src/features/payments/components/PaymentActionPanel.tsx
  - isExternalFlowLocked trava quando initialMode === 'external_pos'
  - showModeSelector ocultado quando isExternalFlowLocked
- restaurante-app/src/screens/PagamentoScreen.tsx
  - Removidos useDevicePayment hook, pagarViaMaquininha, props de device payment

6. Railway — variaveis de ambiente restaurante-web (adicionadas em 2026-04-07)
- EXPO_PUBLIC_FEATURE_PDV_ENABLED=true
- EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT=true
- EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS=true
- EXPO_PUBLIC_OPS_BASE_URL=https://ops.restaurante-web.app.br

7. Documentacao da feature atualizada para escopo web+ops e balanca
- docs/maquininha/prompt-hyperswitch-restaurante.md
- docs/maquininha/README.md
- docs/maquininha/01-arquitetura-tecnica.md
- docs/maquininha/02-fluxos-tecnicos.md
- docs/maquininha/03-contratos-seguranca-observabilidade.md
- docs/maquininha/04-plano-execucao-testes-rollout.md
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
- PaymentActionPanel.tsx validado sem erros de TypeScript
- type-check completo do restaurante-web ainda falha por erros preexistentes e nao relacionados ao escopo da maquininha
- Deploy web pendente (codigo alterado ainda nao publicado no Railway)

3. App mobile
- Arquivos alterados sem erros de TypeScript no escopo PDV
- Build Android pendente (APK ainda nao gerado com as simplificacoes de UX)
- Badge visual "Fluxo Maquininha Externa" pendente de implementacao no app (paridade com web)

4. Seguranca
- Snyk code scan indicou achados XSS preexistentes em restaurante-ops/src/index.ts
- Nesta fase foi decidido nao tratar XSS agora

## Decisoes importantes ja tomadas

1. Escopo desta fase de backend/gateway e estritamente web+ops
2. Nao integrar restaurante-app ao backend de gateway nesta fase
3. Nao chamar Hyperswitch diretamente no frontend; sempre via restaurante-ops
4. Manter fallback/simulacao por flags de ambiente
5. PaymentMode no web mantem 'tef'; no app somente 'normal' | 'external_pos'
6. TEF nao sera reintroduzido no app mobile

## Proximas acoes (ordem sugerida)

### Prioridade imediata (deploy + paridade visual)

1. Deploy web no Railway
- Publicar alteracoes de UX no PaymentActionPanel e env vars ja configuradas
- Validar em producao que flags PDV aparecem e badge de fluxo funciona

2. Badge visual no app (paridade com web)
- Aplicar chip "Fluxo Maquininha Externa" em:
  restaurante-app/src/features/payments/components/PaymentActionPanel.tsx
- Logica: quando isExternalFlowLocked, exibir badge contextual
- Unico caso no app: 'external_pos' -> "Fluxo Maquininha Externa"
- Apos badge: gerar build Android com EAS

### Continuacao de testes e integracao

3. Criar teste unitario para polling do hook useDevicePayment
- Cobrir cenarios:
  - processing -> approved
  - processing -> declined
  - timeout apos janela configurada

4. Adicionar teste de integracao do endpoint de iniciacao com mock de resposta do gateway
- Foco em contrato e estados normalizados

5. Criar/ajustar E2E Playwright de fechamento com maquininha
- Cenario minimo:
  - iniciar pagamento
  - receber status final de sucesso
  - validar reflexo operacional no fluxo da comanda

6. Validar regressao do fluxo de balanca no PDV web
- Garantir que TEF nao impacta leitura de peso

## Prompt para continuar implementando (cole em nova sessao)

Continuar a implementacao da maquininha TEF no escopo restaurante-web + restaurante-ops (sem restaurante-app no backend).

Contexto atual:
- Backend ops com modulo payment-gateway, rotas /payments/initiate, /payments/:transactionId/status e /webhooks/hyperswitch ja implementados.
- Frontend web com iniciacao + polling de status ja implementados em features/pdv.
- PaymentActionPanel do web simplificado: lock de modo, sem dinheiro no TEF, auto-reset, badge visual "Fluxo TEF Integrado"/"Fluxo Maquininha Externa".
- App mobile simplificado: TEF removido completamente de tipos e UI; somente 'normal' | 'external_pos'.
- Railway env vars PDV ja adicionadas ao restaurante-web em producao.
- Migrations aplicadas e sincronizadas.
- Documentacao em docs/maquininha ja atualizada.

Tarefa prioritaria:
0) Executar deploy do restaurante-web no Railway para publicar mudancas de UX.
1) Aplicar badge visual "Fluxo Maquininha Externa" no PaymentActionPanel do app mobile (paridade com web).
2) Criar testes unitarios do polling em useDevicePayment.
3) Criar teste de integracao do endpoint /payments/initiate com mock do gateway.
4) Criar/atualizar E2E Playwright do fluxo de pagamento aprovado.
5) Validar que fluxo de balanca no PDV web segue funcional sem regressao.

Regras:
- Nao integrar restaurante-app ao backend de gateway nesta fase.
- Nao tratar XSS nesta fase.
- Manter tipagem estrita TypeScript.
- Manter abordagem segura (sem segredo no cliente, sem EXPO_PUBLIC para segredo).
- PaymentMode no web mantem 'tef'; no app somente 'normal' | 'external_pos'.
- Nao reintroduzir TEF no app mobile.
