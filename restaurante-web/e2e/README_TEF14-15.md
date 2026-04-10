# Como Executar TEF-14/15 (Validação de Idempotência e Comanda)

## Pré-requisitos

Para executar testes INT_REAL de TEF-14/15, você precisa:

1. ✅ **restaurante-ops deployado** com as mudanças de validação
   - Deploy: `railway up --service restaurante-ops --path-as-root ./restaurante-ops`
   - Verify: `curl https://ops.restaurante-web.app.br/health`

2. ✅ **Bearer Token válido** do servidor REAL (Supabase + Tenant)
   - Token deve ter permissão para chamar `/payments/initiate`
   - Token pode ser obtido:
     - Via login manual no Supabase (veja abaixo)
     - Via script de login (fornecido)
     - De um usuário/serviço de teste validado

3. ✅ **Company ID válido** do seu tenant
   - UUID no formato: `12345678-1234-1234-1234-123456789abc`
   - Deve ter ao menos uma comanda com saldo > 0

---

## Obter Token de Autenticação

### Opção A: Via curl (Manual)

```bash
# 1. Obter token de sessão do Supabase
curl -X POST 'https://seu-supabase.supabase.co/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "seu_email@empresa.com",
    "password": "sua_senha"
  }'

# Resposta:
# {
#   "access_token": "eyJ...",
#   "token_type": "bearer",
#   ...
# }

# 2. Usar o access_token nos testes
export E2E_TEST_TOKEN="eyJ..."
```

### Opção B: Via Supabase CLI

```bash
# Obter token do seu projeto
supabase status

# Ou via Dashboard
# https://app.supabase.com/project/[PROJECT_ID]/settings/api
```

### Opção C: Script Python (fornecido em `scripts/get-auth-token.py`)

```bash
python scripts/get-auth-token.py \
  --email seu_email@empresa.com \
  --password sua_senha \
  --supabase-url https://seu-supabase.supabase.co \
  --anon-key sua_anon_key
```

---

## Executar Testes

### Via Script de Auxiliar (Recomendado)

```bash
cd restaurante-web

# TEF-14: Teste de idempotência
bash scripts/run-tef14-15-tests.sh \
  --token "eyJ..." \
  --company "12345678-1234-1234-1234-123456789abc" \
  --comanda "999" \
  --tef14

# TEF-15: Testes de validação
bash scripts/run-tef14-15-tests.sh \
  --token "eyJ..." \
  --company "12345678-1234-1234-1234-123456789abc" \
  --comanda "999" \
  --tef15

# Todos
bash scripts/run-tef14-15-tests.sh \
  --token "eyJ..." \
  --company "12345678-1234-1234-1234-123456789abc" \
  --comanda "999" \
  --all
```

### Via Variáveis de Ambiente Diretas

```bash
cd restaurante-web

export E2E_TEST_TOKEN="eyJ..."
export E2E_TEST_COMPANY_ID="12345678-1234-1234-1234-123456789abc"
export E2E_TEST_COMANDA="999"
export PLAYWRIGHT_BASE_URL="https://restaurante-web.app.br"
export PLAYWRIGHT_OPS_BASE_URL="https://ops.restaurante-web.app.br"
export PDV_E2E_INT_REAL="true"

# Todos
npx playwright test e2e/pdv-maquininha-validacao.spec.ts --workers=1

# Apenas TEF-14
npx playwright test e2e/pdv-maquininha-validacao.spec.ts --grep 'TEF-14' --workers=1

# Apenas TEF-15
npx playwright test e2e/pdv-maquininha-validacao.spec.ts --grep 'TEF-15' --workers=1
```

---

## Entender os Testes

### TEF-14: Idempotência

**Objetivo**: Garantir que chamar 2x o endpoint com a mesma `idempotencyKey` retorna o mesmo `transactionId`

**Passos**:
1. Chamar `POST /payments/initiate` com `idempotencyKey=X`
2. Backend retorna `transactionId=A`
3. Chamar 2x `POST /payments/initiate` com `idempotencyKey=X` (mesma)
4. Backend retorna `transactionId=A` (MESMO)

**Sucesso**: Ambos os transactionIds são idênticos

### TEF-15a: Comanda Inválida

**Objetivo**: Validar que endpoints rejeitam comandas que não existem

**Passos**:
1. Chamar `POST /payments/initiate` com `comandaNumber=99999999` (inválida)
2. Backend consulta `public.comandas` e não encontra

**Sucesso**: HTTP 400 com mensagem contendo "nao encontrada"

### TEF-15b: Saldo Insuficiente

**Objetivo**: Validar que endpoints rejeitam pagamentos maiores que o saldo

**Passos**:
1. Chamar `POST /payments/initiate` com `amount=999999900` (R$ 9.999.999)
2. Backend consulta `public.comandas` e vê que `open_balance < amount`

**Sucesso**: HTTP 400 com mensagem contendo "insuficiente"

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `Test skipped: E2E_TEST_TOKEN não configurado` | Exporte o token antes: `export E2E_TEST_TOKEN="eyJ..."` |
| `HTTP 401 Unauthorized` | Token expirou ou inválido. Obtenha um novo. |
| `HTTP 404 payment_not_found` | Endpoint `/payments/initiate` não existe em ops. Verifique se foi deployado. |
| `Comanda não encontrada` | Usar `E2E_TEST_COMANDA` existente no tenant (ex: uma comanda já aberta no sistema) |
| `Saldo insuficiente em comanda válida` | Esperado no TEF-15b. Use uma comanda com saldo alto ou crie uma fixa para testes. |

---

## Exemplo Completo de Execução

```bash
cd restaurante-web

# 1. Configurar variáveis
export E2E_TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export E2E_TEST_COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"
export E2E_TEST_COMANDA="999"
export PLAYWRIGHT_OPS_BASE_URL="https://ops.restaurante-web.app.br"
export PDV_E2E_INT_REAL="true"

# 2. Executar
npx playwright test e2e/pdv-maquininha-validacao.spec.ts --workers=1

# Output esperado:
# ✓ TEF-14: Idempotência - mesma chave retorna mesma transação
# ✓ TEF-15a: Validação - rejeita comanda inexistente
# ✓ TEF-15b: Validação - rejeita saldo insuficiente
# 
# 3 passed (25s)
```

---

## Documentação Relacionada

- `docs/maquininha/07-deployment-tef14-tef15.md` - Deploy backend
- `docs/maquininha/04-plano-execucao-testes-rollout.md` - Plano geral
- `docs/maquininha/06-matriz-homologacao-tef-balanca.md` - Matriz de testes
- `.github/copilot-instructions.md` - Regras gerais do projeto

---

**Status**: ✅ Código pronto. Faltando apenas executar com credenciais válidas.

