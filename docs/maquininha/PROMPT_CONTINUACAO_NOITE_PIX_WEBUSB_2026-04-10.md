# Prompt de Continuacao - Pix TEF + Impressao WebUSB

Ultima atualizacao: 2026-04-10 (turno da noite)
Escopo: validacoes manuais pos-deploy + remediacoes residuais do ciclo Pix/USB.

---

## Prompt pronto para colar na nova sessao

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo `restaurante-supabase`.

### Objetivo desta sessao

1. Executar snapshot diario de estabilidade TEF (inicio de turno).
2. Guiar/registrar validacao manual do fluxo Pix TEF em UI de producao.
3. Guiar/registrar validacao manual de impressao WebUSB em Chrome/Edge HTTPS.
4. Remediar issue pre-existente de XSS (CWE-79) em `restaurante-ops/src/index.ts:232`.
5. Atualizar matriz de homologacao com os resultados.

### Regras obrigatorias

- Respeitar `.github/skills/restaurante-supabase/SKILL.md`.
- Preservar isolamento multi-tenant por `company_id` e RLS.
- Nao hardcodar secrets/tokens.
- Nao expor PII em logs/evidencias.
- Nao regredir fluxos criticos (Balcao, Mesa, Delivery, Montagem, Billing).
- Para qualquer mudanca em auth/RLS/billing/CORS, aplicar Security Gate Checklist.

---

## Estado atual confirmado (2026-04-10T19:40:20Z)

### Servicos em producao (Railway)

| Servico | URL | Status |
|---------|-----|--------|
| restaurante-ops | `https://ops.restaurante-web.app.br` | Healthy |
| restaurante-web | `https://restaurante-web.app.br` | Healthy |

### Snapshot funcional mais recente

```
Timestamp UTC: 2026-04-10T19:40:20Z
total=3 passed=3 failed=0 skipped=0
Arquivo: restaurante-web/tmp/evidencias/tef-go-live-snapshot-20260410T194020Z.md
```

### Arquivos alterados neste ciclo (Pix TEF + WebUSB)

Backend (`restaurante-ops`):
- `src/modules/payment-gateway.ts` — tipo `PaymentMethod` inclui `'pix'`, fallback documentado
- `src/modules/payment-initiate-endpoint.ts` — `sanitizePaymentMethod` aceita `'pix'`
- `src/modules/payment-gateway.test.ts` — +1 teste Pix
- `src/modules/payment-initiate-endpoint.test.ts` — +1 teste Pix endpoint

Frontend (`restaurante-web`):
- `src/features/pdv/types/index.ts` — `DevicePaymentMethod` inclui `'pix'`
- `src/features/pdv/services/devicePaymentService.ts` — label Pix corrigido
- `src/screens/PagamentoScreen.tsx` — tri-way (credito/pix/debito) + auto-impressao pos-aprovacao
- `src/screens/PrinterConfigScreen.tsx` — textos USB atualizados
- `src/services/PrinterService.ts` — WebUSB adapter + `printPaymentReceipt()` + fallback chain

### Testes automatizados

- Unitarios ops: 11/11 passed (inclui 2 novos testes Pix)
- TypeScript: zero erros
- Snyk web: 0 issues novos

---

## Tarefas em ordem

### 1. Snapshot diario de inicio de turno (obrigatorio)

```bash
cd d:/restaurante-supabase/restaurante-web
npm run ops:tef:snapshot:prod-web
```

Resultado esperado: `total=3 passed=3 failed=0 skipped=0`
Registrar horario e resultado em `docs/maquininha/10-registro-ativacao-tef-2026-04-10.md`.

### 2. Validacao manual — Pix TEF em producao

Acoes do operador:
1. Abrir `restaurante-web.app.br` no navegador (Chrome ou Edge).
2. Fazer login com tenant de teste.
3. Abrir uma comanda ativa.
4. Entrar em modo TEF (botao "Maquininha TEF").
5. Selecionar metodo "Pix" no `PagamentoScreen`.
6. Confirmar pagamento.
7. Verificar na tabela `pagamentos` (Supabase Studio) que `payment_method = 'pix'` foi gravado.
8. Verificar que o comprovante imprimiu (se impressora conectada) ou que o recibo foi exibido.

Evidencia esperada: screenshot ou registro manual com `payment_method: 'pix'` em Supabase.
Registrar resultado em `docs/maquininha/13-pix-tef-webusb-impressao-2026-04-10.md` (secao 7).

### 3. Validacao manual — Impressao WebUSB

Pre-requisitos:
- Chrome ou Edge em HTTPS (`https://restaurante-web.app.br`).
- Impressora termica USB conectada ao computador.
- USB ativo no navegador (nao bloqueado por politica).

Acoes:
1. Abrir `PrinterConfigScreen` no web.
2. Clicar "Buscar Impressoras".
3. Selecionar a impressora USB no dialogo do navegador.
4. Autorizar acesso ao dispositivo.
5. Executar impressao de teste.
6. Confirmar que o comprovante imprimiu com texto correto.

Evidencia esperada: foto ou registro manual do comprovante impresso.
Registrar resultado em `docs/maquininha/13-pix-tef-webusb-impressao-2026-04-10.md` (secao 7).

### 4. Remediar XSS pre-existente (CWE-79)

Arquivo: `restaurante-ops/src/index.ts`, linha 232.
Fingerprint Snyk: `bc441d81...`
Severidade: High, CWE-79.

Criterio de remediacao:
- Identificar onde `res.send()` ou equivalente usa entrada de request sem escape.
- Sanitizar com `escapeHtml` ou equivalente antes de incluir no response body.
- Aplicar Security Gate Checklist antes de deploy.
- Rodar Snyk Code Scan pos-fix para confirmar remocao do finding.
- Atualizar `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md` com status de remediacão.

### 5. Atualizar matriz de homologacao

Arquivo: `docs/maquininha/06-matriz-homologacao-tef-balanca.md`

Marcar com status `Coberto` e evidencia os itens validados nesta sessao:
- Pix TEF (metodo correto gravado em Supabase)
- Impressao WebUSB (comprovante gerado em hardware real)

---

## Criterio de conclusao desta retomada

- [ ] Snapshot 3/3 executado e registrado.
- [ ] Pix TEF validado manualmente em producao com evidencia.
- [ ] WebUSB validado manualmente com impressora real.
- [ ] XSS CWE-79 remediado e Snyk scan limpo.
- [ ] Matriz de homologacao atualizada.
- [ ] Sem regressao de seguranca (RLS, company_id, sem secrets em codigo/log).

---

## Risco residual e notas

### Rota Pix nativa no Hyperswitch
Pix atualmente usa fallback `card_present/debit`. Quando disponivel rota dedicada:
- Atualizar `payment-gateway.ts`: `payment_method` e `payment_method_data.type` para tipo Pix.
- Adicionar feature flag `FEATURE_PIX_GATEWAY_NATIVE` para rollout gradual.
- Testar em sandbox Hyperswitch antes de ativar em producao.

### Feature flag LicenseGate
`BILLING_ENABLED=true` nao deve ser ativado em producao ate que `LicenseGate` cubra
`NovoPedidoScreen`, `ComandaGerenciamentoScreen` e `RotasDeliveryScreen`.
Ver: `restaurante-app/src/components/LicenseGate.tsx`.

---

## Documentos de referencia

- `docs/maquininha/13-pix-tef-webusb-impressao-2026-04-10.md` — registro desta sessao
- `docs/maquininha/10-registro-ativacao-tef-2026-04-10.md` — log operacional diario
- `docs/maquininha/06-matriz-homologacao-tef-balanca.md` — quadro de homologacao
- `docs/maquininha/08-runbook-ativacao-tef-producao-hoje.md` — runbook de ativacao
- `docs/maquininha/12-handoff-d1-plantao-2026-04-11.md` — checklist D+1
- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md` — audit report com XSS aberto
- `.github/skills/restaurante-supabase/SKILL.md` — skill principal do projeto

---

## Se houver bloqueio

### Sem hardware para WebUSB
- Documentar bloqueio no `13-pix-tef-webusb-impressao-2026-04-10.md` (secao 7).
- Registrar que validacao de hardware real fica pendente para quando dispositivo disponivel.
- Nao alterar codigo de negocio.

### Sem permissao USB no browser
- Verificar se o site esta em HTTPS (obrigatorio para WebUSB).
- Verificar se a politica do navegador permite USB (chrome://settings/content/usbDevices).
- Registrar evidencia da restricao com screenshot.

### XSS nao localizavel na linha 232
- Rodar Snyk scan novamente para confirmar linha atual.
- Nao tentar fix por suposicao; ler o trecho com contexto de pelo menos 10 linhas.
