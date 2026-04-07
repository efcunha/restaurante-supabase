# PROMPT DE CONTINUACAO (DIA SEGUINTE)

Use este prompt para retomar a implementacao exatamente do ponto atual da integracao PDV (maquininha) no `restaurante-supabase`.

Ultima atualizacao: **2026-04-07** — sessao de UX simplification + Railway env vars PDV.

---

## Prompt pronto para uso

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo `restaurante-supabase`.

### Regras obrigatorias antes de qualquer alteracao

1. Ler e respeitar:
- `.github/skills/restaurante-supabase/SKILL.md`
- `docs/maquininha/README.md`
- `docs/maquininha/01-arquitetura-tecnica.md`
- `docs/maquininha/02-fluxos-tecnicos.md`
- `docs/maquininha/03-contratos-seguranca-observabilidade.md`
- `docs/maquininha/04-plano-execucao-testes-rollout.md`
- `docs/balanca/01-arquitetura-tecnica-camadas.md`
- `docs/balanca/03-contratos-api-bridge.md`
- `docs/balanca/04-dados-migracoes-rls.md`

2. Guardrails inegociaveis:
- Multi-tenant por `company_id`.
- RLS obrigatoria nas novas tabelas.
- Sem hardcode de secrets.
- Sem usar `EXPO_PUBLIC_*` para segredo sensivel.
- LGPD: sem PII em claro em logs.
- Fluxo legado de pagamento nao pode quebrar.

3. Antes de finalizar qualquer etapa:
- Rodar validacao de erros de TypeScript nos arquivos alterados.
- Rodar Snyk Code Scan nos arquivos novos/alterados.

---

## Estado atual (ja implementado — atualizado em 2026-04-07)

### Railway — restaurante-web (variáveis de ambiente adicionadas)

Variaveis adicionadas ao servico `restaurante-web` no Railway (production):
- `EXPO_PUBLIC_FEATURE_PDV_ENABLED=true`
- `EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT=true`
- `EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS=true`
- `EXPO_PUBLIC_OPS_BASE_URL=https://ops.restaurante-web.app.br`

### App mobile (`restaurante-app`) — simplificacao de UX PDV

Arquivos alterados:

- `restaurante-app/src/components/comandas/ComandaDetails.tsx`
  - Removido botao "TEF INTEGRADO" (mobile nao usa TEF integrado)
  - Mantido apenas botao "MAQUININHA EXTERNA" condicionado a `externalPosEnabled`
  - Tipo `onOpenPdvMode` restrito a `'external_pos'` (era `'external_pos' | 'tef'`)

- `restaurante-app/src/screens/PagamentoScreen.tsx`
  - Removidos: `pdvDevicePaymentEnabled`, hook `useDevicePayment`, funcao `pagarViaMaquininha`
  - Removidas props `onUseDevicePayment`, `showDevicePaymentAction`, `isDevicePaymentBusy`
  - Mantido: `pdvExternalPosEnabled`, `registrarPagamentoExterno`, `initialPaymentMode`

- `restaurante-app/src/features/payments/types.ts`
  - `PaymentMode = 'normal' | 'external_pos'` (removido `'tef'`)
  - Removidos campos `onUseDevicePayment?`, `showDevicePaymentAction?`, `isDevicePaymentBusy?` de `PaymentActionPanelProps`

- `restaurante-app/src/features/payments/components/PaymentModeSelector.tsx`
  - Removida prop `showTef` e opcao TEF da lista de opcoes
  - Agora suporta apenas Normal e Maquininha Externa

- `restaurante-app/src/features/payments/components/PaymentActionPanel.tsx`
  - Removidos props e logica TEF
  - `isExternalFlowLocked = initialMode === 'external_pos'` — trava quando entrar via maquininha externa
  - `showModeSelector` oculto quando `isExternalFlowLocked` (elimina seletor redundante)

### Web (`restaurante-web`) — simplificacao de UX PDV

Arquivo alterado:

- `restaurante-web/src/features/payments/components/PaymentActionPanel.tsx`
  - `tefPaymentMethods = ['pix', 'cartao_credito', 'cartao_debito']` — sem `dinheiro` no fluxo TEF
  - Lock logic:
    - `isTefFlowLocked = initialMode === 'tef' && showDevicePaymentAction`
    - `isExternalFlowLocked = initialMode === 'external_pos' && showExternalPosOption`
    - `isModeLocked = isTefFlowLocked || isExternalFlowLocked`
    - `showModeSelector` oculto quando `isModeLocked` (elimina seletor redundante)
  - `effectivePaymentMode: PaymentMode = isModeLocked ? initialMode : paymentMode`
  - `methodsForCurrentMode` usa `tefPaymentMethods` quando modo efetivo for `'tef'`
  - `modeLockLabel` — badge visual contextual:
    - `'tef'` → "Fluxo TEF Integrado"
    - `'external_pos'` → "Fluxo Maquininha Externa"
  - `useEffect` auto-reset: quando entra em TEF com `forma === 'dinheiro'`, reseta para `'cartao_debito'`

### Web (base tecnica PDV — sessao anterior)

Arquivos novos:
- `restaurante-web/src/features/pdv/index.ts`
- `restaurante-web/src/features/pdv/types/index.ts`
- `restaurante-web/src/features/pdv/hooks/useDevicePayment.ts`
- `restaurante-web/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-web/src/features/pdv/services/devicePaymentService.ts`
- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`

Arquivos alterados (sessao anterior):
- `restaurante-web/src/config/featureFlags.ts` — flags `pdv_enabled`, `pdv_devicePayment_enabled`, `pdv_scale_enabled`
- `restaurante-web/src/features/payments/types.ts`
- `restaurante-web/src/screens/PagamentoScreen.tsx`

Comportamento atual:
- `PaymentMode` no web: `'normal' | 'tef' | 'external_pos'` (TEF mantido no web/desktop)
- `PaymentMode` no app: `'normal' | 'external_pos'` (TEF removido do mobile)
- Seletor de modo ocultado quando usuario ja entra por fluxo especifico (evita redundancia)
- Fluxo legado de pagamento manual permanece ativo e intacto em ambas superficies

---

## Pendencias imediatas (proxima sessao)

### 1. Badge visual no app (paridade com web) — PEQUENA
- Aplicar `modeLockLabel` chip em `restaurante-app/src/features/payments/components/PaymentActionPanel.tsx`
- Logica: quando `isExternalFlowLocked`, exibir badge "Fluxo Maquininha Externa"
- No app nao ha TEF, entao so 1 caso: `'Fluxo Maquininha Externa'`
- Aguardava confirmacao no final da sessao

### 2. Deploy web — OBRIGATORIO
- Alteracoes de codigo no web ainda nao foram deployadas
- Executar deploy no Railway para publicar mudancas de UI + env vars ja configuradas
- Comando: `cd restaurante-web && railway up` (ou script de deploy existente)
- Validar no `https://restaurante-web.app.br` que flags PDV aparecem e UX esta correta

### 3. Build Android — RECOMENDADO
- Alteracoes de simplificacao mobile ainda nao foram buildadas
- Executar build Android para gerar novo APK com TEF removido e seletor corrigido
- Validar na tela de pagamento do app que nao aparece mais opcao de TEF

---

## Proximo grande objetivo (backend + integracao real)

### Backend `restaurante-ops` (prioridade maxima)
- Criar modulo de pagamento presencial dedicado (ex: `src/modules/payment-gateway.ts`).
- Implementar endpoint `POST /payments/initiate`.
- Implementar endpoint `GET /payments/:id/status`.
- Implementar webhook `POST /webhooks/hyperswitch` com idempotencia.
- Aplicar middlewares existentes de auth, rate limit e validacao rigorosa.
- Mascarar erros sensiveis e nao vazar segredos.

### Banco de dados (migration + RLS)
- Criar migration para configuracao de gateway por empresa (`payment_gateway_configs`).
- Criar migration para transacoes presenciais (`payment_transactions`).
- Aplicar RLS por `company_id` nas novas tabelas.
- Aplicar migration no banco alvo e confirmar no historico remoto.

### Integracao web com endpoints reais
- Em `devicePaymentService.ts`, manter simulacao por flag, mas conectar fluxo real aos endpoints de `restaurante-ops`.
- Em `PagamentoScreen.tsx`, quando `approved`, registrar pagamento de forma segura sem quebrar o fluxo atual.
- Garantir fallback claro para erro/timeout (manual supervisionado).

### Balanca (fase inicial)
- Nao criar UX complexa nesta sessao.
- Validar contrato de bridge no `scaleBridgeService.ts` com tratamento robusto de timeout/instabilidade.
- Preparar ponto de integracao para tela futura de item por peso.

### Testes obrigatorios
- Unit tests para mapping de status, validacao e idempotencia (ops + web service).
- E2E minimo do web para:
  - iniciar maquininha (simulacao)
  - fluxo aprovado
  - fluxo recusado/erro
  - fallback manual sem quebra
- Confirmar sem regressao em Balcao, Mesa e Delivery (smoke).

### Seguranca e observabilidade
- Garantir trilha de auditoria por `idempotency_key`.
- Garantir logs sem PAN/CVV/segredos.
- Validar cenarios de replay de webhook (nao duplicar estado/transacao).

---

## Contrato minimo esperado para endpoint de inicio

`POST /payments/initiate`

Request (exemplo):
```json
{
  "companyId": "uuid",
  "comandaNumber": "123",
  "amount": 2590,
  "paymentMethod": "cartao_debito",
  "idempotencyKey": "company:comanda:timestamp:nonce"
}
```

Response (sucesso):
```json
{
  "status": "processing",
  "transactionId": "txn_...",
  "message": "Pagamento presencial iniciado"
}
```

Response (erro):
```json
{
  "error": "mensagem sanitizada"
}
```

---

## Definition of Done desta continuacao

- [ ] Badge visual de fluxo no app aplicado (paridade com web)
- [ ] Deploy web executado e validado em producao
- [ ] Build Android gerado com simplificacoes de UX
- [ ] Endpoints de maquininha no `restaurante-ops` implementados e validados
- [ ] Migration criada/aplicada/verificada para tabelas de maquininha
- [ ] RLS validada para isolamento por `company_id`
- [ ] Frontend web consumindo endpoint real com fallback seguro
- [ ] Testes criticos (unitarios + E2E minimo) passando
- [ ] Snyk scan sem novos issues introduzidos
- [ ] Documentacao atualizada em `docs/maquininha/` com evidencias de validacao

---

## Restricoes de implementacao

- Nao refatorar em massa o fluxo legado agora.
- Nao introduzir breaking changes em `PagamentosService` sem cobertura de teste.
- Nao alterar billing/licensing sem necessidade direta.
- Nao criar dependencias sem justificativa tecnica e de seguranca.
- `PaymentMode` no web mantem `'tef'`; no app mantem apenas `'normal' | 'external_pos'`.
- Nao reintroduzir TEF no app mobile.

---

## Contexto tecnico adicional

- Feature flags PDV: `src/config/featureFlags.ts` com defaults `false` e override via `EXPO_PUBLIC_FEATURE_PDV_*`
- Railway CLI: se `RAILWAY_TOKEN` invalida no shell, executar `unset RAILWAY_TOKEN` antes de comandos Railway
- Supabase CLI: instalado via Scoop em `C:\Users\ECUNHA\scoop\shims\supabase.exe`
- Fluxo de pagamento: `ComandaDetails → navigate('Pagamento', { paymentMode }) → PagamentoScreen → PaymentActionPanel`
- `initialMode` propagado via `route.params.initialPaymentMode` de `ComandaDetails` para `PagamentoScreen`

---

## Entregue ao final da proxima sessao

1. Lista objetiva de arquivos alterados.
2. Resumo de seguranca (o que foi protegido e como).
3. Resultado dos testes executados.
4. Pendencias para proxima iteracao (se houver).

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.
