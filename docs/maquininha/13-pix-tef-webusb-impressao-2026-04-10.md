# 13 - Registro: Suporte Pix TEF + Impressao WebUSB (2026-04-10)

Ciclo: turno da noite — extensao do pacote TEF-14/TEF-15.
Data: 2026-04-10
Status: Implementado, deployado e validado em producao.

---

## 1. Contexto e motivacao

Apos o go-live de TEF-14/TEF-15 (idempotencia + validacoes de saldo/comanda), foram
identificados dois bugs bloqueadores no fluxo de maquininha:

1. **Bug Pix TEF silencioso**: em `PagamentoScreen.tsx`, o metodo de pagamento era
   convertido implicitamente: qualquer valor diferente de `cartao_credito` caía em
   `cartao_debito`. Logo, Pix TEF era enviado ao backend como `cartao_debito`.
2. **Impressora sempre em mock no web**: `PrinterService.ts` usava `require()`
   condicional em runtime, mas o branch `Platform.OS === 'web'` sempre carregava
   `PrinterService.mock.js`, tornando qualquer impressao real impossivel no browser.

---

## 2. Arquivos alterados

### restaurante-ops (backend)

| Arquivo | Mudanca |
|---------|---------|
| `src/modules/payment-gateway.ts` | `PaymentMethod` estendido com `'pix'`; validacao e mensagem de erro atualizadas; fallback gateway explicito documentado em comentario |
| `src/modules/payment-initiate-endpoint.ts` | `sanitizePaymentMethod()` retorna `'pix'` como valor valido |
| `src/modules/payment-gateway.test.ts` | Novo teste: `validateInitiatePaymentInput aceita pix no payload valido` |
| `src/modules/payment-initiate-endpoint.test.ts` | Novo teste: `handleInitiatePaymentEndpoint aceita paymentMethod pix` |

### restaurante-web (frontend)

| Arquivo | Mudanca |
|---------|---------|
| `src/features/pdv/types/index.ts` | `DevicePaymentMethod` estendido: `'cartao_credito' \| 'cartao_debito' \| 'pix'` |
| `src/features/pdv/services/devicePaymentService.ts` | `buildPaymentMethodLabel` retorna `'pix'` para Pix (era fallback `'debito'`) |
| `src/screens/PagamentoScreen.tsx` | Correcao tri-way (credito/pix/debito) + import `PrinterService` + auto-impressao de comprovante apos aprovacao |
| `src/screens/PrinterConfigScreen.tsx` | Textos de UI atualizados para contexto USB (eram genericos para bluetooth) |
| `src/services/PrinterService.ts` | Reescrita para suportar WebUSB: `createWebUsbEscPosAdapter()`, novo metodo `printPaymentReceipt()`, fallback chain: native → WebUSB → mock |

---

## 3. Detalhe das correcoes criticas

### 3.1 Correcao do metodo de pagamento Pix

```typescript
// ANTES (bug): Pix caia em cartao_debito
const paymentMethod = forma === 'cartao_credito' ? 'cartao_credito' : 'cartao_debito';

// DEPOIS (corrigido): tri-way explicito
const paymentMethod =
  forma === 'cartao_credito'
    ? 'cartao_credito'
    : forma === 'pix'
      ? 'pix'
      : 'cartao_debito';
```

Arquivo: `restaurante-web/src/screens/PagamentoScreen.tsx`

### 3.2 Cadeia de fallback da impressora (web)

```
1. react-native-esc-pos-printer  →  se Platform.OS !== 'web' (native mobile/desktop)
2. createWebUsbEscPosAdapter()   →  se navigator.usb disponivel (Chrome/Edge HTTPS)
3. PrinterService.mock.js        →  fallback final (sem hardware ou permissao)
```

Arquivo: `restaurante-web/src/services/PrinterService.ts`

### 3.3 Auto-impressao de comprovante TEF

Apos `status === 'approved'` em `PagamentoScreen.tsx`, se a impressora estiver conectada:

```typescript
await PrinterService.printPaymentReceipt({
  comandaNumber, paymentMethod, amount,
  operatorName, transactionId, providerPaymentId,
  authCode, paidAt,
});
```

---

## 4. Nota de rota Pix no gateway

Atualmente, Pix e mapeado para `payment_method_data: { type: 'debit' }` no payload do
Hyperswitch (mesma rota de `cartao_debito`). Isso e um fallback controlado documentado
em comentario em `payment-gateway.ts`. Quando o Hyperswitch disponibilizar rota Pix
nativa para terminais presenciais, atualizar:

- `payment_method: 'bank_redirect'` (ou tipo correto para Pix)
- Remover comentario de fallback
- Adicionar feature flag de rollout

---

## 5. Testes executados

### Unitarios (restaurante-ops)

Comando: `cd restaurante-ops && npm run build && node --test dist/modules/payment-gateway.test.js dist/modules/payment-initiate-endpoint.test.js`

```
Resultado: total=11 passed=11 failed=0
```

Novos testes cobertos:
- `validateInitiatePaymentInput aceita pix no payload valido`
- `handleInitiatePaymentEndpoint aceita paymentMethod pix`

### Snyk Code Scan

- `restaurante-web`: 0 issues novos
- `restaurante-ops`: 1 issue pre-existente (CWE-79 XSS em `index.ts:232`) — fora do escopo desta sessao

### TypeScript build

- Todos os arquivos alterados sem erros de TypeScript.

---

## 6. Deploy e snapshot pos-deploy

### Deploy restaurante-ops

- Metodo: `./scripts/deploy-railway.sh` no diretorio `restaurante-ops`
- Resultado: `Deploy complete`, `server.started`, Redis conectado
- URL: `https://ops.restaurante-web.app.br`
- Tempo de build: ~33s

### Deploy restaurante-web

- Metodo: `./scripts/deploy-railway.sh` no diretorio `restaurante-web`
- Resultado: `Deploy complete`, `[1/1] Healthcheck succeeded!`
- URL: `https://restaurante-web.app.br`
- Tempo de build: ~134s

### Snapshot funcional pos-deploy

Comando: `npm run ops:tef:snapshot:prod-web`

```
Resultado: total=3 passed=3 failed=0 skipped=0
Timestamp UTC: 2026-04-10T19:40:20Z
Arquivo: restaurante-web/tmp/evidencias/tef-go-live-snapshot-20260410T194020Z.md
```

Criterios TEF-14 e TEF-15 mantidos em pass apos o novo deploy.

---

## 7. Risco residual e validacoes manuais pendentes

| Item | Tipo | Status |
|------|------|--------|
| Pix TEF em UI de producao (PagamentoScreen + comanda real) | Manual | Pendente |
| WebUSB com impressora termica real via Chrome/Edge HTTPS | Manual | Pendente |
| Rota Pix nativa no Hyperswitch (gateway dedicado) | Futura | Planejada |
| XSS CWE-79 em `restaurante-ops/src/index.ts:232` | Pre-existente | Ciclo separado |

---

## 8. Referencia cruzada de documentos

- `docs/maquininha/10-registro-ativacao-tef-2026-04-10.md` — snapshot `19:40:20Z` registrado
- `docs/maquininha/11-encerramento-executivo-tef-2026-04-10.md` — historico do go-live TEF-14/15
- `docs/maquininha/12-handoff-d1-plantao-2026-04-11.md` — checklist de inicio de turno D+1
- `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md` — estado consolidado para proxima sessao
