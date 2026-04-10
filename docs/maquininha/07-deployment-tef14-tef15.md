# TEF-14/TEF-15: Deployment e Execução (2026-04-10)

## Mudanças Implementadas

### 1. Backend (restaurante-ops/src/modules/payment-gateway.ts)

#### Nova Função: `validateComandaAndBalance()`
```typescript
async function validateComandaAndBalance(
  companyId: string,
  comandaNumber: string,
  amountCents: number,
): Promise<string | null>
```

**Comportamento:**
- Consulta `public.comandas` com filtros `company_id` e `comanda_number`
- Se comanda não existe: retorna erro `"Comanda XXX nao encontrada."`
- Se comanda status ≠ 'aberta': retorna erro com status atual
- Se `open_balance < (amountCents / 100)`: retorna erro de saldo insuficiente
- Se tudo ok: retorna `null` (sem erro)

**Erro Codes:**
- HTTP 400 para comanda inválida/saldo insuficiente
- Mensagens sanitizadas (sem exposição de valores internos)

#### Modificação: `initiatePayment()`
- Adicionada chamada a `validateComandaAndBalance()` **antes** de verificar idempotência
- Garante que comandas inválidas/sem saldo são sempre rejeitadas
- Mantém idempotência: retry com mesma chave retorna mesma transação

### 2. Frontend Tests (restaurante-web/e2e/pdv-maquininha-validacao.spec.ts)

Três cenários de teste:

#### TEF-14: Idempotência
```
POST /payments/initiate { companyId, comandaNumber, amount, idempotencyKey }
POST /payments/initiate { SAME companyId, SAME comandaNumber, SAME amount, SAME idempotencyKey }

Assert: Ambos retornam 202 com o MESMO transactionId
```

#### TEF-15a: Comanda Inválida
```
POST /payments/initiate { companyId, invalidComandaNumber="99999", amount, idempotencyKey }

Assert: Response.status = 400
Assert: Response.message contains "nao encontrada"
```

#### TEF-15b: Saldo Insuficiente
```
POST /payments/initiate { companyId, validComandaNumber="999", excessiveAmount=999999900, idempotencyKey }

Assert: Response.status = 400
Assert: Response.message contains "insuficiente"
```

## Como Fazer o Deployment

### Opção 1: Via Railway CLI (Preferido)
```bash
cd d:/restaurante-supabase

# Autenticar (se não estiver logado):
railway login

# Deploy restaurante-ops com mudanças de validação:
railway up --service restaurante-ops --path-as-root ./restaurante-ops
```

### Opção 2: Via Railway Web Dashboard (Manual)
1. Acesse https://railway.app/project/[PROJECT_ID]
2. Selecione o serviço `restaurante-ops`
3. Vá para "Deploy" → "Manual Deploy"
4. Git: selecione branch atual (commit com mudanças em payment-gateway.ts)
5. Clique "Deploy"

### Opção 3: Via Git Push + Auto-Deploy
Se configurado no Railway:
```bash
cd d:/restaurante-supabase
git add restaurante-ops/src/modules/payment-gateway.ts
git commit -m "feat(TAX-14/15): Add comanda validation and balance checks"
git push origin main
# Railway auto-triggers deploy on push
```

## Como Executar os Testes

### Pré-requisitos
- restaurante-ops deployado com mudanças de validação
- restaurante-web deployado com novos testes E2E
- Acesso autenticado para o endpoint /payments/initiate

### Executar todos os testes de validação
```bash
cd d:/restaurante-supabase/restaurante-web

# Test 1: Idempotência (TEF-14)
npm run test:e2e:pdv-validacao:int-real:tef14:prod-web

# Test 2: Validação de Comanda (TEF-15)
npm run test:e2e:pdv-validacao:int-real:tef15:prod-web

# Ou todos de uma vez:
npm run test:e2e:pdv-validacao:int-real:prod-web
```

## Checklist de Validação (DEF)

- [ ] restaurante-ops buildado e deployado
- [ ] restaurante-web com novos E2E tests
- [ ] TEF-14 test: confirma idempotência
- [ ] TEF-15 test: confirma rejeição de comanda inválida
- [ ] TEF-15 test: confirma rejeição de saldo insuficiente
- [ ] Evidências coletadas e registradas
- [ ] Matriz de homologação atualizada

## Status Operacional

**Mudanças Implementadas**: ✅
- Backend validations (payment-gateway.ts)
- E2E test suite (pdv-maquininha-validacao.spec.ts)
- Test scripts (package.json)

**Deployment**: ⏳ Pendente
- Railway CLI token inválido no contexto atual
- Alternatives: Manual via Railway Web UI ou Git auto-deploy

**Execução de Testes**: ⏳ Pendente
- Aguardando deployment do restaurante-ops
- Após deploy: executar npm scripts acima

## Documentação

Todos os código incluí comentários explicativos:
- TEF-14: Testa idempotência do backend
- TEF-15: Testa validações de comanda e saldo
- Sanitização de mensagens de erro para não expor PII

## Próximos Passos

1. **Imediato**: Deploy via Railway Dashboard (ou CLI com token válido)
2. **Após Deploy**: Executar testes E2E
3. **Evidência**: Capturar output dos testes no console
4. **Matriz**: Atualizar `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
   - TEF-14: evidência de `transactionId` idênticos
   - TEF-15: evidência de `400` errors com mensagens apropriadas
