# PROMPT DE CONTINUACAO (DIA SEGUINTE)

Use este prompt para retomar a implementacao exatamente do ponto atual da integracao PDV (balanca + maquininha) no `restaurante-supabase`.

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

## Estado atual (ja implementado)

### Web (base tecnica PDV criada)

Arquivos novos:
- `restaurante-web/src/features/pdv/index.ts`
- `restaurante-web/src/features/pdv/types/index.ts`
- `restaurante-web/src/features/pdv/hooks/useDevicePayment.ts`
- `restaurante-web/src/features/pdv/hooks/useScaleReading.ts`
- `restaurante-web/src/features/pdv/services/devicePaymentService.ts`
- `restaurante-web/src/features/pdv/services/scaleBridgeService.ts`

Arquivos alterados:
- `restaurante-web/src/config/featureFlags.ts`
  - flags adicionadas:
    - `pdv_enabled`
    - `pdv_devicePayment_enabled`
    - `pdv_scale_enabled`
- `restaurante-web/src/features/payments/types.ts`
- `restaurante-web/src/features/payments/components/PaymentActionPanel.tsx`
- `restaurante-web/src/screens/PagamentoScreen.tsx`

Comportamento atual:
- Existe botao opcional de maquininha na tela de pagamento via feature flags.
- Fluxo legado de pagamento manual permanece ativo e intacto.
- Balança ainda nao integrada visualmente (apenas service/hook base).

Resultado de seguranca atual:
- Snyk Code Scan: 0 issues nos arquivos implementados.

---

## Objetivo desta sessao

Concluir a integracao funcional de backend + frontend para maquininha e preparar o caminho de balanca, mantendo seguranca, idempotencia e nao regressao dos fluxos criticos.

---

## Ordem de execucao obrigatoria (continuacao)

1. Backend `restaurante-ops` (prioridade maxima)
- Criar modulo de pagamento presencial dedicado (ex: `src/modules/payment-gateway.ts`).
- Implementar endpoint `POST /payments/initiate`.
- Implementar endpoint `GET /payments/:id/status`.
- Implementar webhook `POST /webhooks/hyperswitch` com idempotencia.
- Aplicar middlewares existentes de auth, rate limit e validacao rigorosa.
- Mascarar erros sensiveis e nao vazar segredos.

2. Banco de dados (migration + RLS)
- Criar migration para configuracao de gateway por empresa (`payment_gateway_configs`).
- Criar migration para transacoes presenciais (`payment_transactions`).
- Aplicar RLS por `company_id` nas novas tabelas.
- Aplicar migration no banco alvo e confirmar no historico remoto.

3. Integracao web com endpoints reais
- Em `devicePaymentService.ts`, manter simulacao por flag, mas conectar fluxo real aos endpoints de `restaurante-ops`.
- Em `PagamentoScreen.tsx`, quando `approved`, registrar pagamento de forma segura sem quebrar o fluxo atual.
- Garantir fallback claro para erro/timeout (manual supervisionado).

4. Balança (fase inicial)
- Nao criar UX complexa nesta sessao.
- Validar contrato de bridge no `scaleBridgeService.ts` com tratamento robusto de timeout/instabilidade.
- Preparar ponto de integracao para tela futura de item por peso.

5. Testes obrigatorios
- Unit tests para mapping de status, validacao e idempotencia (ops + web service).
- E2E minimo do web para:
  - iniciar maquininha (simulacao)
  - fluxo aprovado
  - fluxo recusado/erro
  - fallback manual sem quebra
- Confirmar sem regressao em Balcao, Mesa e Delivery (smoke).

6. Seguranca e observabilidade
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

- Endpoints de maquininha no `restaurante-ops` implementados e validados.
- Migration criada/aplicada/verificada para tabelas de maquininha.
- RLS validada para isolamento por `company_id`.
- Frontend web consumindo endpoint real com fallback seguro.
- Testes criticos (unitarios + E2E minimo) passando.
- Snyk scan sem novos issues introduzidos.
- Documentacao atualizada em `docs/maquininha/` com evidencias de validacao.

---

## Restricoes de implementacao

- Nao refatorar em massa o fluxo legado agora.
- Nao introduzir breaking changes em `PagamentosService` sem cobertura de teste.
- Nao alterar billing/licensing sem necessidade direta.
- Nao criar dependencias sem justificativa tecnica e de seguranca.

---

## Entregue ao final da sessao

1. Lista objetiva de arquivos alterados.
2. Resumo de seguranca (o que foi protegido e como).
3. Resultado dos testes executados.
4. Pendencias para proxima iteracao (se houver).

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.
