# Prompt — Integração Hyperswitch (gateway de pagamento presencial)

## Contexto do projeto

Projeto: `restaurante-supabase` — POS/PDV full-stack para restaurantes brasileiros.
Stack: React Native (Expo 54), TypeScript estrito, Supabase (PostgreSQL 15 + RLS + Realtime).
Monorepo: `restaurante-app/` (nativo), `restaurante-web/` (Expo Web), `restaurante-ops/` (billing/admin).

---

## Objetivo

Implementar suporte a pagamento presencial via **Hyperswitch** (self-hosted, open source — github.com/juspay/hyperswitch) como camada de orquestração entre o PDV e os adquirentes físicos (Stone, Cielo, PagBank, Getnet).

O Hyperswitch funcionará como **roteador de pagamentos**: o SaaS faz uma única chamada REST ao Hyperswitch, e ele roteia para o adquirente correto com base na configuração do restaurante. O dinheiro vai direto para a conta do restaurante — o SaaS nunca toca nos fundos.

---

## Premissas de negócio (não alterar)

1. Cada restaurante possui contrato próprio com seu adquirente (Stone, Cielo, PagBank etc.).
2. O restaurante fornece suas credenciais (`api_key` + `terminal_id`) ao SaaS via painel de configuração.
3. O SaaS cobra mensalidade fixa — não cobra taxa por transação e não é sub-adquirente.
4. O Hyperswitch será hospedado pelo próprio SaaS (Railway, Fly.io ou similar).
5. O fluxo de pagamento físico usa **maquininha presente** (card present / TEF), não pagamento online.

---

## Escopo desta implementação

### 1. Banco de dados — migrações Supabase

Criar migration em `database-backup/migrations/<timestamp>_add_payment_gateway_config.sql`:

```sql
-- Tabela de configuração de gateway por restaurante (multi-tenant)
CREATE TABLE payment_gateway_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  adquirente      TEXT NOT NULL CHECK (adquirente IN ('stone', 'cielo', 'pagbank', 'getnet')),
  terminal_id     TEXT NOT NULL,
  -- api_key NUNCA armazenada aqui; vai para Supabase Vault ou variável de ambiente criptografada
  hyperswitch_merchant_id   TEXT NOT NULL,  -- merchant_id gerado no Hyperswitch ao cadastrar o restaurante
  hyperswitch_profile_id    TEXT NOT NULL,  -- profile_id do Hyperswitch (por ponto de venda)
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)  -- um adquirente ativo por restaurante nesta fase
);

-- RLS: restaurante só acessa sua própria config
ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company isolamento" ON payment_gateway_configs
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Tabela de transações (registro imutável de cada cobrança)
CREATE TABLE payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id),
  comanda_id            UUID REFERENCES comandas(id),
  hyperswitch_payment_id TEXT NOT NULL UNIQUE,  -- id retornado pelo Hyperswitch
  adquirente            TEXT NOT NULL,
  valor_centavos        INTEGER NOT NULL CHECK (valor_centavos > 0),
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','succeeded','failed','cancelled')),
  auth_code             TEXT,
  erro_codigo           TEXT,
  erro_mensagem         TEXT,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company isolamento" ON payment_transactions
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Índice para lookup por comanda
CREATE INDEX idx_payment_transactions_comanda ON payment_transactions(company_id, comanda_id);
```

**Regras de segurança:**
- `api_key` do adquirente NUNCA vai para o banco. Usar **Supabase Vault** ou passar via variável de ambiente do `restaurante-ops`.
- Seguir `SEC-01` a `SEC-08` do SECURITY_AUDIT_REPORT (sem hardcode, sem `EXPO_PUBLIC_*` para segredos, PII mascarado em logs).

---

### 2. Serviço backend — `restaurante-ops`

Criar `restaurante-ops/src/modules/payment-gateway.ts`:

```typescript
// payment-gateway.ts
// Responsabilidade: orquestrar chamadas ao Hyperswitch self-hosted
// O dinheiro vai direto ao restaurante — este serviço apenas coordena

import { createClient } from '@supabase/supabase-js';

const HYPERSWITCH_BASE_URL = process.env.HYPERSWITCH_BASE_URL!; // ex: https://hyperswitch.seudominio.com
// NUNCA usar EXPO_PUBLIC_* para esta chave (SEC-07)
const HYPERSWITCH_API_KEY = process.env.HYPERSWITCH_API_KEY!;

export interface InitiatePaymentParams {
  company_id: string;
  comanda_id: string;
  valor_centavos: number;  // sempre em centavos
  descricao?: string;
}

export interface PaymentResult {
  hyperswitch_payment_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  auth_code?: string;
  erro?: string;
}

/**
 * Inicia cobrança na maquininha via Hyperswitch.
 * O Hyperswitch roteia ao adquirente configurado para o restaurante.
 */
export async function initiateCardPresentPayment(
  params: InitiatePaymentParams
): Promise<PaymentResult> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role — apenas no ops, nunca no app
  );

  // 1. Buscar configuração do restaurante (multi-tenant via company_id)
  const { data: config, error: configError } = await supabase
    .from('payment_gateway_configs')
    .select('hyperswitch_merchant_id, hyperswitch_profile_id, terminal_id, adquirente')
    .eq('company_id', params.company_id)
    .eq('ativo', true)
    .single();

  if (configError || !config) {
    throw new Error(`Gateway não configurado para company_id=${params.company_id}`);
  }

  // 2. Criar PaymentIntent no Hyperswitch
  const hsResponse = await fetch(`${HYPERSWITCH_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': HYPERSWITCH_API_KEY,
    },
    body: JSON.stringify({
      amount: params.valor_centavos,
      currency: 'BRL',
      payment_method: 'card',
      payment_method_type: 'card_present',  // maquininha física
      capture_method: 'automatic',
      confirm: true,
      merchant_id: config.hyperswitch_merchant_id,
      profile_id: config.hyperswitch_profile_id,
      metadata: {
        company_id: params.company_id,
        comanda_id: params.comanda_id,
        terminal_id: config.terminal_id,
      },
      description: params.descricao ?? 'Pagamento PDV',
    }),
  });

  if (!hsResponse.ok) {
    const err = await hsResponse.json();
    throw new Error(`Hyperswitch erro: ${err.error?.message ?? hsResponse.statusText}`);
  }

  const hsData = await hsResponse.json();

  // 3. Registrar transação no banco (imutável, para auditoria e reconciliação)
  await supabase.from('payment_transactions').insert({
    company_id: params.company_id,
    comanda_id: params.comanda_id,
    hyperswitch_payment_id: hsData.payment_id,
    adquirente: config.adquirente,
    valor_centavos: params.valor_centavos,
    status: mapHyperswitchStatus(hsData.status),
    auth_code: hsData.payment_method_data?.card?.auth_code ?? null,
    metadata: { hyperswitch_raw: hsData },
  });

  return {
    hyperswitch_payment_id: hsData.payment_id,
    status: mapHyperswitchStatus(hsData.status),
    auth_code: hsData.payment_method_data?.card?.auth_code,
  };
}

/**
 * Webhook handler — Hyperswitch notifica mudanças de status assincronamente.
 * Registrar em: POST /webhooks/hyperswitch
 */
export async function handleHyperswitchWebhook(payload: Record<string, unknown>): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const paymentId = payload.payment_id as string;
  const newStatus = mapHyperswitchStatus(payload.status as string);

  // Idempotente: não reprocessa se status já estiver igual (regra de billing do projeto)
  const { data: existing } = await supabase
    .from('payment_transactions')
    .select('status')
    .eq('hyperswitch_payment_id', paymentId)
    .single();

  if (existing?.status === newStatus) return;

  await supabase
    .from('payment_transactions')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      erro_codigo: (payload.error as Record<string, string>)?.code ?? null,
      erro_mensagem: (payload.error as Record<string, string>)?.message ?? null,
    })
    .eq('hyperswitch_payment_id', paymentId);
}

function mapHyperswitchStatus(
  hsStatus: string
): 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' {
  const map: Record<string, 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled'> = {
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'processing',
    processing: 'processing',
    succeeded: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
  };
  return map[hsStatus] ?? 'pending';
}
```

---

### 3. Endpoint REST — `restaurante-ops`

Adicionar em `restaurante-ops/src/index.ts`:

```typescript
// POST /payments/initiate
app.post('/payments/initiate', async (req, res) => {
  try {
    // Validar JWT do request (usuário autenticado no SaaS)
    const { company_id, comanda_id, valor_centavos } = req.body;

    if (!company_id || !comanda_id || !valor_centavos) {
      return res.status(400).json({ error: 'company_id, comanda_id e valor_centavos são obrigatórios' });
    }

    const result = await initiateCardPresentPayment({ company_id, comanda_id, valor_centavos });
    return res.json(result);
  } catch (err) {
    // Mascarar detalhes internos no response (SEC-06)
    console.error('[payment] Erro ao iniciar pagamento:', err);
    return res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

// POST /webhooks/hyperswitch
app.post('/webhooks/hyperswitch', async (req, res) => {
  // Validar assinatura do webhook (HMAC — configurar no painel Hyperswitch)
  const signature = req.headers['x-hyperswitch-signature'];
  if (!isValidSignature(req.body, signature as string)) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }
  await handleHyperswitchWebhook(req.body);
  return res.json({ received: true });
});
```

---

### 4. Serviço no app/web — `src/services/paymentService.ts`

Criar espelhado em `restaurante-app/src/services/` e `restaurante-web/src/services/`:

```typescript
// paymentService.ts — chamado pelo PDV ao fechar comanda
// NÃO chama Hyperswitch diretamente — passa pelo restaurante-ops (SEC-07)

import { supabase } from '../config/SupabaseConfig';

export interface PaymentRequest {
  comanda_id: string;
  valor_centavos: number;
}

export interface PaymentResponse {
  hyperswitch_payment_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  auth_code?: string;
}

export async function iniciarPagamentoPresencial(
  params: PaymentRequest
): Promise<PaymentResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Sessão inválida');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_OPS_API_URL}/payments/initiate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Falha ao iniciar pagamento');
  }

  return response.json();
}
```

---

### 5. Feature flag (Phase 12 / canary)

Adicionar em `restaurante-app/src/config/featureFlags.ts` e espelhar em `restaurante-web/`:

```typescript
// Adicionar à lista de flags existente
EXPO_PUBLIC_FEATURE_HYPERSWITCH_PAYMENT: 'hyperswitch_payment_enabled'
```

Usar antes de chamar `iniciarPagamentoPresencial`:

```typescript
if (flags.hyperswitch_payment_enabled) {
  await iniciarPagamentoPresencial({ comanda_id, valor_centavos });
} else {
  // fallback: fluxo de pagamento manual atual
}
```

---

### 6. Infraestrutura — Hyperswitch self-hosted

Deploy recomendado em Railway (já usado pelo `restaurante-ops`):

```bash
# Clone do Hyperswitch
git clone https://github.com/juspay/hyperswitch
cd hyperswitch

# Configurar variáveis de ambiente mínimas
HYPERSWITCH_SECRET_KEY=<gerar com openssl rand -hex 32>
DB_URL=postgresql://...  # banco dedicado, separado do Supabase do app
REDIS_URL=redis://...

# Deploy
railway up
```

Após o deploy:
1. Acessar painel Hyperswitch (`/dashboard`).
2. Criar **Merchant** para cada restaurante que for ativado.
3. Configurar o conector do adquirente escolhido (Stone, Cielo, PagBank) com a `api_key` do restaurante.
4. Copiar `merchant_id` e `profile_id` gerados → salvar em `payment_gateway_configs` no Supabase.

---

## Checklist de implementação

### Banco
- [ ] Migration `payment_gateway_configs` aplicada e validada no remoto
- [ ] Migration `payment_transactions` aplicada
- [ ] RLS ativo e testado com usuário de outro `company_id`
- [ ] `api_key` do adquirente **não está** em nenhuma coluna do banco

### Backend (ops)
- [ ] `payment-gateway.ts` implementado e com tipagem estrita
- [ ] Endpoint `POST /payments/initiate` protegido por JWT
- [ ] Endpoint `POST /webhooks/hyperswitch` com validação de assinatura HMAC
- [ ] Webhook atualiza `payment_transactions` de forma idempotente
- [ ] Nenhum dado sensível em `console.log` (SEC-06)

### App / Web
- [ ] `paymentService.ts` espelhado em app e web
- [ ] Feature flag `hyperswitch_payment_enabled` criada e protegendo o fluxo
- [ ] Fluxo de pagamento atual preservado como fallback quando flag = false
- [ ] Nenhuma chamada ao Hyperswitch ou adquirente feita diretamente do app (tudo via ops)

### Infraestrutura
- [ ] Hyperswitch rodando em ambiente isolado (não misturar com banco do app)
- [ ] `HYPERSWITCH_BASE_URL` e `HYPERSWITCH_API_KEY` apenas em variáveis server-side
- [ ] Webhook URL configurada no painel Hyperswitch apontando para `/webhooks/hyperswitch`

### Testes
- [ ] Teste unitário de `mapHyperswitchStatus` (todos os status cobertos)
- [ ] Teste de integração do endpoint `/payments/initiate` com mock do Hyperswitch
- [ ] Teste E2E Playwright: fechar comanda → acionar pagamento → verificar status `succeeded` em `payment_transactions`
- [ ] Smoke test em produção com flag ativa para 1 restaurante piloto antes de rollout geral

---

## Rollback

```bash
# Desabilitar feature flag (sem deploy)
EXPO_PUBLIC_FEATURE_HYPERSWITCH_PAYMENT=false

# Se necessário reverter migration
supabase migration repair --status reverted <timestamp>_add_payment_gateway_config
```

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Hyperswitch fora do ar | Fallback para fluxo manual com feature flag |
| Credencial do adquirente vazar | Nunca armazenar no banco; usar Supabase Vault ou env server-side |
| Webhook duplicado | Atualização idempotente por `hyperswitch_payment_id` |
| Drift app/web | Implementar `paymentService.ts` espelhado no mesmo PR |
| RLS bypassado | Testar com usuário de `company_id` diferente antes de promover |
