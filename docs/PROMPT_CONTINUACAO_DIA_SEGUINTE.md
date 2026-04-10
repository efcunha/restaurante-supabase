# PROMPT DE CONTINUACAO (DIA SEGUINTE)

Use este prompt para retomar a implementacao exatamente do ponto atual da integracao PDV (maquininha) no `restaurante-supabase`.

Ultima atualizacao: **2026-04-10** — TEF-12/TEF-13 validados em INT_REAL com evidencia de polling. TEF-14/TEF-15 implementados em backend + suite E2E API-direct, aguardando deployment e execucao real.

Atualizacao de handoff (turno da tarde):
- Suite `restaurante-web/e2e/pdv-maquininha-validacao.spec.ts` foi consolidada como API-direct (sem login por UI).
- Execucao INT_REAL depende de `E2E_TEST_TOKEN` e `E2E_TEST_COMPANY_ID`.
- Helper disponivel: `restaurante-web/scripts/run-tef14-15-tests.sh`.
- Evidencia final pendente: output com TEF-14 (transactionId igual) e TEF-15 (HTTP 400 nos dois cenarios).

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
- `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
- `docs/balanca/01-arquitetura-tecnica-camadas.md`
- `docs/balanca/03-contratos-api-bridge.md`
- `docs/balanca/04-dados-migracoes-rls.md`

2. Nao usar prompts historicos como fonte principal de continuidade:
- `docs/maquininha/PROMPT_CONTINUACAO_MAQUININHA_2026-04-07.md` e apenas referencia historica
- `docs/maquininha/PROMPT_INICIALIZACAO_PROJETO.md` e prompt de bootstrap, nao de continuidade do estado atual

3. Guardrails inegociaveis:
- Multi-tenant por `company_id`.
- RLS obrigatoria nas novas tabelas.
- Sem hardcode de secrets.
- Sem usar `EXPO_PUBLIC_*` para segredo sensivel.
- LGPD: sem PII em claro em logs.
- Fluxo legado de pagamento nao pode quebrar.

4. Antes de finalizar qualquer etapa:
- Rodar validacao de erros de TypeScript nos arquivos alterados.
- Rodar Snyk Code Scan nos arquivos novos/alterados.

---

## Estado atual (ja implementado — atualizado em 2026-04-08)

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

### ✅ Concluido em 2026-04-08

- Badge visual de lock no app aplicado em `restaurante-app/src/features/payments/components/PaymentActionPanel.tsx`.
- Deploy web executado no Railway e healthcheck aprovado.
- Build Android `preview` executado no EAS e concluido.
- Gate de TypeScript do `restaurante-app` reabilitado (`npm run type-check` sem erros).
- Snyk Code Scan executado nos arquivos alterados sem novos issues.
- Smoke E2E web (balcao, mesa, pizza, delivery, mesa-consolidacao) executado com sucesso.

### Itens ativos para a proxima iteracao

Use `docs/maquininha/06-matriz-homologacao-tef-balanca.md` como quadro de execucao da iteracao. Sempre que um cenario for validado ou automatizado, refletir o status e a evidencia documental.

### 1. Validacao funcional de release (app + web)
- Validar no APK novo: fluxo de pagamento sem opcao TEF no mobile.
- Validar lock de modo quando entrar por maquininha externa no app.
- Validar em producao web o fluxo travado correto por modo (TEF e maquininha externa).
- Evidencia atual web (`INT_REAL`): response real em `POST /payments/initiate` com `404` e payload `code=gateway_not_configured` para o tenant autenticado.
- CORS de pagamentos validado apos deploy do `restaurante-ops` (`Access-Control-Allow-Origin` presente para origem canônica web).
- Proximo desbloqueio para `TEF-11`: configurar `payment_gateway_configs` ativo no tenant autenticado e validar credenciais server-side do gateway (ou simulação controlada) para obter `processing`.
- Atualizacao desta rodada: `payment_gateway_configs` ativo cadastrado no tenant do E2E; `POST /payments/initiate` evoluiu para `503` (erro server-side sanitizado), indicando bloqueio atual em infraestrutura/credenciais de gateway.
- Atualizacao final desta rodada: `TEF-11` concluido em `INT_REAL` com response real `202` e `status=processing` apos habilitar simulação controlada (`PDV_DEVICE_SIMULATION=true`) no `restaurante-ops`.
- Atualizacao desta rodada: `TEF-12` validado em `INT_REAL` com transicao observada no polling (`processing -> succeeded`) sem duplicidade de baixa da comanda.
- Atualizacao desta rodada: `TEF-13` validado em `INT_REAL` com timeout operacional e polling ativo (`/payments/:id/status` com requests/responses observados), sem sucesso falso.

### 2. Fluxo PDV real ponta-a-ponta
- Consolidar validacao de endpoints reais de maquininha no `restaurante-ops` com evidencias de seguranca e idempotencia.
- Garantir fallback manual supervisionado em erro/timeout no frontend web.
- Atualizar evidencias em `docs/maquininha/`.

### 3. Pendencias mapeadas na matriz de homologacao

Prioridade alta nesta continuidade:

- TEF `MOCK_AUTO`: `TEF-08`, `TEF-09`, `TEF-10`
- TEF `INT_REAL`: `TEF-11`, `TEF-12`, `TEF-13` (cobertos); `TEF-14`, `TEF-15` (pendentes)
- Balanca `MOCK_AUTO`: `BAL-06`, `BAL-07`, `BAL-08`
- Balanca `INT_REAL`: `BAL-09`, `BAL-10`, `BAL-11`, `BAL-12`
- Integrado PDV: `INT-02`, `INT-03`

---

## Proximo grande objetivo (consolidacao fluxo real + validacao final)

### Backend `restaurante-ops` (hardening e evidencias)
- Consolidar validacao de endpoints reais ja implementados (`/payments/initiate`, `/payments/:id/status`, webhook).
- Reforcar evidencias de idempotencia, saneamento de erros e trilha de auditoria.
- Confirmar que middlewares de auth/rate-limit/validacao continuam ativos sem regressao.

### Banco de dados (validacao operacional)
- Confirmar consistencia de `payment_gateway_configs` e `payment_transactions` no remoto.
- Revalidar politicas RLS por `company_id` e regras de menor privilegio.
- Registrar evidencias de catalogo remoto (`pg_policies` / historico de migration) para fechamento da fase.

### Integracao web com endpoints reais
- Em `devicePaymentService.ts`, manter simulacao por flag, mas conectar fluxo real aos endpoints de `restaurante-ops`.
- Em `PagamentoScreen.tsx`, quando `approved`, registrar pagamento de forma segura sem quebrar o fluxo atual.
- Status atual: implementado registro automatico apos `approved` no web com fallback manual supervisionado. Validacoes `INT_REAL` de `TEF-11`, `TEF-12` e `TEF-13` concluidas; pendentes `TEF-14` e `TEF-15`.
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

### Ordem recomendada de execucao nesta continuidade

1. Cobrir primeiro cenarios `MOCK_AUTO` pendentes da matriz, porque reduzem risco e aumentam repetibilidade.
2. Em seguida executar validacao `INT_REAL` controlada de TEF com evidencias sanitizadas.
3. Depois executar validacao `INT_REAL` da balanca e os cenarios integrados PDV.
4. Ao final, atualizar `docs/maquininha/06-matriz-homologacao-tef-balanca.md` e `docs/maquininha/04-plano-execucao-testes-rollout.md` com o status real.

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

- [x] Badge visual de fluxo no app aplicado (paridade com web)
- [x] Deploy web executado e validado em producao
- [x] Build Android gerado com simplificacoes de UX
- [x] Endpoints de maquininha no `restaurante-ops` implementados e validados (conforme status de fase em `docs/maquininha/04-plano-execucao-testes-rollout.md`)
- [x] Migration criada/aplicada/verificada para tabelas de maquininha (conforme status de fase em `docs/maquininha/04-plano-execucao-testes-rollout.md`)
- [x] RLS validada para isolamento por `company_id` (conforme status de fase em `docs/maquininha/04-plano-execucao-testes-rollout.md`)
- [x] Frontend web consumindo endpoint real com fallback seguro (implementacao + validacao funcional `INT_REAL` para `TEF-11/12/13` concluidas)
- [x] **TEF-14/TEF-15 implementados (2026-04-10)**:
  - Backend validacoes adicionadas: `validateComandaAndBalance()` em `restaurante-ops/src/modules/payment-gateway.ts`
  - E2E test suite API-direct criado: `restaurante-web/e2e/pdv-maquininha-validacao.spec.ts`
  - Test scripts adicionados ao `package.json`: `test:e2e:pdv-validacao:int-real:*`
  - Helper de execucao adicionado: `restaurante-web/scripts/run-tef14-15-tests.sh`
  - Status: **Codigo pronto, validacao INT_REAL pendente** → Ver `docs/maquininha/07-deployment-tef14-tef15.md`
- [ ] Testes criticos (unitarios + E2E minimo) totalmente concluidos para o fluxo PDV dedicado (`MOCK_AUTO` concluido; `INT_REAL` parcial com `TEF-11/12/13` concluido e `TEF-14/15` code-ready, validation-pending)
- [x] Snyk scan sem novos issues introduzidos
- [x] Documentacao atualizada em `docs/maquininha/` com evidencias de validacao
- [ ] Matriz de homologacao (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`) atualizada com status e evidencias reais da rodada (TEF-14/15 pendentes de execucao p/ evidencia)

---

## Proximos passos na continuacao

### 1. Deployment de TEF-14/TEF-15 ⏳
**Bloqueador atual**: Railway CLI token invalida no contexto. Alternativas:
- [ ] Executar `railway login` com credenciais validas
- [ ] Fazer deploy via Railway Web Dashboard manual
- [ ] Usar git push + auto-deploy (se configurado)

**Comando preferido**:
```bash
cd d:/restaurante-supabase
railway up --service restaurante-ops --path-as-root ./restaurante-ops
```

### 2. Execucao de Testes INT_REAL ⏳
Apos deployment:
```bash
cd restaurante-web

# Todos os testes:
npm run test:e2e:pdv-validacao:int-real:prod-web

# Individual:
npm run test:e2e:pdv-validacao:int-real:tef14:prod-web  # TEF-14: idempotencia
npm run test:e2e:pdv-validacao:int-real:tef15:prod-web  # TEF-15: validacoes
```

### 3. Atualizacao de Matriz ⏳
Pos-teste: atualizar `06-matriz-homologacao-tef-balanca.md`:
- TEF-14 row status = "Coberto" com evidencia de transationId idênticos
- TEF-15 row status = "Coberto" com evidencia de HTTP 400 errors

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
