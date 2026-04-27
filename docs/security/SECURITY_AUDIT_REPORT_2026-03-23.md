# 🔐 AUDITORIA DE SEGURANÇA, DEVOPS E LGPD

## Projeto: restaurante-supabase (POS/PDV Full-Stack)

**Data:** 23 de março de 2026  
**Auditor:** GitHub Copilot (AppSec Expert)  
**Escopo:** Web + Mobile + Backend + DevOps + LGPD  
**Status:** Auditoria histórica usada como baseline de remediação

> Atualização de status em 25 de março de 2026
>
> Este documento registra os achados da auditoria original de 23/03. Parte dos itens críticos já foi mitigada no código e nas migrations desde então.
>
> Estado consolidado para billing / Mercado Pago em 25/03:
>
> - Segredos operacionais de backup/restore: mitigados com `database-backup/.env.local` gitignored e templates seguros.
> - `public.profiles` RLS: corrigido por migration de hardening com políticas restritivas para self + admin/gerente da mesma empresa.
> - CORS das Edge Functions: corrigido com allowlist por origem, sem fallback wildcard.
> - Rate limiting de `restaurante-ops`: implementado com modo estrito fail-closed (`503` quando o limiter estiver indisponível).
> - Billing Mercado Pago: sem bloqueador estrutural aberto de segurança/compliance; decisão de produção depende da execução e aprovação do smoke funcional S1-S5.
>
> ---
>
> ### ⚠️ NOVOS ACHADOS CRÍTICOS — Cardápio Digital (2026-03-25)
>
> A criação das rotas públicas do cardápio QR expôs superfície de ataque nova. Quatro vulnerabilidades críticas identificadas e migration de correção criada:
>
> **🔴 CRÍTICO-C1 — execute_sql callable por `anon` (RCE/SQLi)**
>
> - `public.execute_sql(query text, params jsonb)` é `SECURITY DEFINER` (roda como postgres) e estava concedida ao role `anon`.
> - Via `/rest/v1/rpc/execute_sql`, qualquer visitante do cardápio público podia executar SQL arbitrário com privilégios de superusuário, bypassando todo RLS.
> - **Correção**: `REVOKE ALL ON FUNCTION execute_sql FROM anon, authenticated` em `20260325180000_harden_anon_function_grants_cardapio.sql`.
>
> **🔴 CRÍTICO-C2 — Funções financeiras/operacionais callable por `anon`**
>
> - `registrar_pagamento_comanda`, `close_cash_register`, `close_comanda`, `adicionar_consumo_atomico` estavam concedidas a `anon` (todas SECURITY DEFINER).
> - Um visitante do cardápio podia registrar pagamentos falsos, fechar comandas e caixas de qualquer empresa.
> - **Correção**: `REVOKE ALL ON FUNCTION ... FROM anon` para cada função na mesma migration.
>
> **🔴 CRÍTICO-C3 — DEFAULT PRIVILEGES concedem ALL ON FUNCTIONS a `anon`**
>
> - `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon` estava ativo no schema dump.
> - Toda nova função criada herdava automaticamente acesso anon, incluindo futuras funções do cardápio (upload, checkout, etc).
> - **Correção**: `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon` + `REVOKE ALL ON TABLES FROM anon`.
>
> **🟠 ALTO-C4 — public_menu_company_read expõe colunas sensíveis (LGPD)**
>
> - A RLS policy `public_menu_company_read` permitia `SELECT *` em `companies` para empresas publicadas.
> - Colunas expostas indevidamente: `cnpj`, `document`, `plan`, `settings` (jsonb interno), `contact_name`.
> - **Correção**: Policy removida; criada VIEW `public_menu_companies` com apenas os 9 campos públicos necessários; `GRANT SELECT ON VIEW TO anon`.
>
> **🟠 ALTO-C5 — get_company_by_menu_slug SECURITY DEFINER sem SET search_path**
>
> - Função SECURITY DEFINER sem `SET search_path` é vulnerável a search path injection.
> - **Correção**: Função recriada com `SET search_path = public` na mesma migration.
>
> Migration gerada: `database-backup/migrations/20260325180000_harden_anon_function_grants_cardapio.sql`
> **Aplicar imediatamente antes de habilitar qualquer rota pública do cardápio.**

---

## 📋 EXECUTIVO

**Vulnerabilidades Críticas Encontradas:** 5  
**Vulnerabilidades Altas:** 8  
**Vulnerabilidades Médias:** 12  
**Quick Wins:** 4

### Riscos Imediatos

1. ✅ **MITIGADO**: Segredos operacionais movidos para fluxo seguro fora de versionamento
2. ✅ **MITIGADO EM E2E**: Chaves Supabase deixaram de ficar hardcoded nos specs; uso padronizado por variáveis de ambiente
3. ✅ **MITIGADO**: CORS sem wildcard fallback (`*`), agora com allowlist explícita
4. ✅ **MITIGADO**: `public.profiles` deixou de usar RLS permissiva em produção
5. ✅ **MITIGADO**: Webhook de billing exige assinatura HMAC válida com proteção contra replay
6. ⏳ **PENDENTE DE GO/NO-GO**: Smoke funcional S1-S5 do billing antes de promover APP_USR em produção

---

## 1️⃣ MAPEAMENTO INICIAL

### 1.1 Tipo de Aplicação

- **Frontend:** React Native (Expo) + React Web (Expo Web)
- **Backend:** Node.js (TypeScript) + Supabase (PostgreSQL + Edge Functions)
- **Mobile:** iOS/Android via Expo
- **SaaS OPS:** restaurante-ops (Node.js, operações/billing/auth)
- **Arquitetura:** Multi-tenant, monorepo, serverless (Supabase), Railway deployment

### 1.2 Stack Tecnológico

```
Frontend:
  - React 19.1.0
  - React Native 0.81-0.84
  - Expo 54.x
  - TypeScript 5.9
  - React Navigation (tabs, stack)
  - AsyncStorage + Expo SecureStore

Backend:
  - Node.js (Deno Edge no Supabase)
  - TypeScript
  - Supabase (Auth, DB, Realtime, Edge Functions)
  - PostgreSQL 14+
  - Firebase Analytics
  - Sentry (error tracking)
  - Mercado Pago (payments)

DevOps:
  - Supabase CLI (migrations)
  - GitHub Actions (security scanning)
  - Railway (deployment)
  - Gitleaks + Snyk + Trivy
```

### 1.3 Fluxo de Autenticação

```
Mobile/Web → Supabase Auth (OAuth/Email)
            → JWT token (session storage)
            → SecureStore (mobile) / AsyncStorage (web)
            → RLS policies validam company_id
```

### 1.4 Fluxos de Dados Sensíveis

1. **Pedidos:** Cliente → App/Web → Supabase RLS → Comanda → Cozinha → Pagamento → Delivery
2. **Pagamentos:** Checkout → Mercado Pago → Edge Function → Supabase (invoice, subscription)
3. **Billing:** Invoice → Payment Method → Subscription → Audit Log
4. **LGPD:** DSAR Request → Anonymization → Audit Trail (imutável 3 anos)

### 1.5 Pontos de Entrada

- Mobile: Expo Dev Client + Production
- Web: restaurante-web (Expo Web)
- API: Supabase Auth, PostgreSQL RLS, Edge Functions (billing, webhooks)
- Webhooks: Mercado Pago → billing-webhook Edge Function
- Admin: restaurante-ops (internal SaaS)

---

## 2️⃣ ANÁLISE OWASP TOP 10

### A01 - Broken Access Control

#### ❌ CRÍTICO (histórico, mitigado em 2026-03-23/24): RLS Permissiva em `profiles` confirmada no banco remoto

**Localização:** Banco remoto (`pg_policies`) e `database-backup/migrations/20260311161100_schema_dump.sql:2602-2609`

```sql
CREATE POLICY "authenticated_pull_profiles" ON "public"."profiles"
FOR SELECT TO "authenticated" USING (true);  -- ← QUALQUER usuário autenticado lê TODOS
```

**Impacto:** Usuário A pode acessar perfil completo de Usuário B (nome, email, role, company_id).

**Status de evidência:** Confirmado no banco remoto via consulta direta a `pg_policies`. A validação também mostrou drift adicional no `CHECK` de roles de `profiles`, ainda limitado a `admin`, `manager`, `waiter` e `kitchen`.

**Severidade:** CRÍTICO  
**Correção:**

```sql
-- ✅ CORRETO: Apenas seu próprio perfil
CREATE POLICY "authenticated_pull_own_profile" ON "public"."profiles"
FOR SELECT TO "authenticated" USING (auth.uid() = id);
```

**Atualização 25/03/2026:** item mitigado. A migration `20260323183000_harden_profiles_rls_and_role_guardrails.sql` substituiu a policy permissiva por políticas restritivas para leitura própria e administração da mesma empresa.

#### ⚠️ ALTA: Falta de Validação de company_id em Algumas Operações

**Localização:** `restaurante-app/scripts/fix-permissions.sql` (grant all to service_role)

**Impacto:** Se alguém conseguir injetar um `company_id` diferente, acessa dados de outra empresa

**Severidade:** ALTA  
**Correção:** OBRIGATÓRIO usar `validateCompanyContext()` do `auth-secure.ts` em TODA função crítica

#### ✅ BOM: restaurante-ops implementa validação rigorosa

**Localização:** `restaurante-ops/src/auth/supabase.ts:53-73`

```typescript
if (profile.company_id !== OPS_ALLOWED_COMPANY_ID) {
  throw new Error('Acesso negado');
}
// Multi-tenant validation ✅
```

---

### A02 - Cryptographic Failures / Sensitive Data Exposure

#### ❌ CRÍTICO (histórico, mitigado): Senhas de Banco de Dados Hardcodeadas

**Localização 1:** `database-backup/backup.bat:32`

```batch
set SOURCE_DB_PASSWORD=REDACTED_DB_PASSWORD
```

**Localização 2:** `database-backup/restore.bat:18`

```batch
set TARGET_DB_PASSWORD=REDACTED_DB_PASSWORD
```

**Localização 3:** `database-backup/.env.local`

```bash
SOURCE_DB_PASSWORD=REDACTED_DB_PASSWORD
```

**Atualização 25/03/2026:** o fluxo recomendado passou a usar `database-backup/.env.local` gitignored e `database-backup/.env.example`. Os arquivos legados `config.local.sh` e `config.example.sh` saíram do fluxo operacional.

**Impacto:** MÁXIMO - Acesso total ao banco de dados de produção/staging

**Severidade:** CRÍTICO  
**Correção:**

```bash
# ✅ CORRETO: Usar variáveis de ambiente bem protegidas
export SOURCE_DB_PASSWORD="${DB_BACKUP_PASSWORD}"
# ou
source ~/.secure/db-credentials.env  # Arquivo com 600 permissions, .gitignored

# NO .gitignore:
database-backup/.env.local
*.key *.pem *.p12
```

#### ⚠️ ALTA: Chaves de API Supabase Hardcodeadas em E2E Tests

**Localização 1-4:**

- `restaurante-web/e2e/mesa.spec.ts:9`
- `restaurante-web/e2e/mesa-consolidacao.spec.ts:7`
- `restaurante-web/e2e/race-condition-cross-marking.spec.ts:16`
- `restaurante-web/e2e/race-condition-comanda-grouping.spec.ts:9`

```typescript
const SUPABASE_ANON_KEY = '[REDACTED_SUPABASE_ANON_KEY]';
```

**Impacto:** MÉDIO - Chaves publicáveis (anon_key) têm escopo limitado por RLS, mas exposição é anti-padrão

**Severidade:** ALTA  
**Correção:**

```typescript
// ✅ CORRETO: Usar variáveis de ambiente
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
// ou para Playwright:
test.beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY || '';
});
```

#### ⚠️ ALTA: Firebase API Key Hardcodeada

**Localização:** `restaurante-web/.env.example:12`

```
EXPO_PUBLIC_FIREBASE_API_KEY=[REDACTED_FIREBASE_API_KEY]
```

**Impacto:** MÉDIO - Chave pública (anon), mas deve estar em .env.example VAZIO

**Severidade:** ALTA  
**Correção:**

```
# ✅ CORRETO
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
# (não commitado com valor real)
```

#### ✅ BOM: Tokens armazenados com segurança no mobile

**Localização:** `restaurante-app/src/utils/SecureStorageAdapter.ts`

```typescript
// ✅ Usa Expo SecureStore (iOS Keychain, Android Keystore)
// ✅ Fallback para AsyncStorage no web
```

#### ✅ BOM: HTTPS/TLS obrigatório

**Localização:** `restaurante-ops/src/index.ts:103`

```typescript
// Supabase + Railway ambos com HTTPS/TLS 1.2+
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

---

### A03 - Injection

#### ✅ BOM: Sanitização de inputs centralizada

**Localização:** `restaurante-web/src/utils/validation.ts:50-75`

```typescript
export const sanitizeString = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .replace(/[&<>"']/g /* escape */); // Escape special chars
};
```

**Validações:** Cliente name, email, observações, preço → todas com sanitização + regex

#### ✅ BOM: Supabase SDK previne SQL injection

- `.eq()`, `.select()`, `.insert()` usam prepared statements
- **Nunca** concatenação de strings em queries

#### ⚠️ MÉDIA: Falta de proteção em JSONB parsing

**Localização:** `database-backup/supabase/functions/billing-webhook/index.ts:140`

```typescript
payload = JSON.parse(rawBody); // Se rawBody for inválido, pode gerar erro
// Falta validação de schema da payload
```

**Correção:**

```typescript
try {
  const schema = z.object({
    action: z.enum(['payment.created', 'payment.updated']),
    data: z.object({
      /* ... */
    }),
  });
  payload = schema.parse(JSON.parse(rawBody));
} catch (error) {
  throw new HttpError(400, 'Invalid payload format');
}
```

---

### A04 - Insecure Design

#### ⚠️ ALTA (histórico, mitigado em restaurante-ops): Falta de Rate Limiting em Operações Críticas

**Localização:** `restaurante-web/src/services/RateLimiterService.ts` (implementado, mas...)

**Problema:** Rate limiter está em memória no cliente JavaScript

**Severidade:** ALTA  
**Correção:** Rate limiting **deve** estar no servidor/edge function

```typescript
// Edge Function billing-create-checkout deve implementar:
const rateLimitKey = `${userId}:checkout`;
const count = await redis.incr(rateLimitKey);
if (count > 5) {
  // Max 5 checkouts/minuto/usuário
  throw new HttpError(429, 'Too many requests');
}
await redis.expire(rateLimitKey, 60);
```

**Atualização 25/03/2026:** `restaurante-ops` já aplica rate limiting em login e em rotas críticas de billing, com suporte a modo estrito fail-closed quando Redis/limiter estiver indisponível.

#### ⚠️ ALTA (histórico, mitigado): CORS Configuration com Wildcard Fallback

**Localização:** `database-backup/supabase/functions/_shared/cors.ts:9-22`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': resolveAllowOrigin(), // Pode ser '*'
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resolveAllowOrigin(): string {
  const rawOrigins = Deno.env.get('CORS_ALLOWED_ORIGINS') || '';
  // ... if (origins.length > 1) { return '*'; }  ← PROBLEMA
}
```

**Severidade:** ALTA  
**Impacto:** CSRF por wildcard Accept-Origin

**Correção:**

```typescript
// ✅ CORRETO: Nunca permitir wildcard para credenciais
if (origins.length === 0) {
  throw new Error('CORS_ALLOWED_ORIGINS não configurado em produção');
}
// Sempre validar origin específico contra whitelist
const allowedOrigins = ['https://restaurante.com', 'https://web.restaurante.com'];
const origin = req.headers.get('origin') || '';
if (!allowedOrigins.includes(origin)) {
  return ''; // Nega CORS
}
```

**Atualização 25/03/2026:** o helper compartilhado de CORS agora responde apenas para origens presentes em `CORS_ALLOWED_ORIGINS` e bloqueia origens fora da allowlist, sem fallback permissivo.

---

### A05 - Security Misconfiguration

#### ✅ BOM: Headers de Segurança Implementados

**Localização:** `restaurante-ops/src/index.ts:95-110`

```typescript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Referrer-Policy', 'same-origin');
res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
```

#### ⚠️ MÉDIA: Falta de CSP (Content-Security-Policy)

**Localização:** Não encontrada

**Severidade:** MÉDIA  
**Correção:** Adicionar em Edge Functions + Web app

```typescript
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; " +
    "connect-src 'self' https://api.supabase.co; frame-ancestors 'none';",
);
```

#### ✅ BOM: Railway + Supabase em produção

- HTTPS obrigatório
- Variáveis de ambiente via Railway secrets (não em `.env` commitado)

---

### A06 - Vulnerable and Outdated Components

#### ✅ BOM: CI/CD com Gitleaks + Snyk + Trivy

**Localização:** `.github/workflows/security.yml`

```yaml
- name: Run Gitleaks
  uses: gitleaks/gitleaks-action@v2
- name: Snyk Scan
  uses: snyk/actions/node@master
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
```

#### ⚠️ ALTA: Dependências Desatualizadas Detectadas

**Análise de versões:**

```
✅ React 19.1.0 (latest)
✅ React Native 0.81-0.84 (recent)
❌ Expo 54.0.33 (54.x, check for 55+)
✅ Supabase JS 2.56-2.94 (latest 2.x)
✅ TypeScript 5.9.2 (latest)

Dependências Outdated:
- @react-native-community/cli: versão ^11.4 → verificar ^12+
- TypeScript: ^5.9 → verificar ^5.10+
```

**Severidade:** ALTA  
**Correção:**

```bash
npm outdated  # Listar desatualizadas
npm update    # Atualizar (com cuidado)
npm audit fix # Fixar vulnerabilidades reportadas
```

#### ⚠️ MÉDIA: Firebase SDK Desatualizado

```
firebase: ^12.10.0 (verificar se há ^13.x)
```

**Correção:**

```bash
npm update firebase@latest
```

---

### A07 - Identification and Authentication Failures

#### ✅ BOM: JWT via Supabase Auth

- Expiração automática (default 3600s)
- Refresh token armazenado em SecureStore
- Auto-refresh habilitado

**Localização:** `restaurante-app/src/config/SupabaseConfig.ts:19`

```typescript
auth: {
  storage: SecureStorageAdapter,
  autoRefreshToken: true,  // ✅
  persistSession: true,
}
```

#### ⚠️ ALTA: Falta de MFA (Multi-Factor Authentication)

**Localização:** Não implementado

**Severidade:** ALTA (especialmente para admin)  
**Correção:**

```typescript
// Habilitar Supabase Auth MFA
const { data, error } = await supabase.auth.mfa.enroll({
  issuer: 'restaurante-supabase',
  totp: { name: 'Restaurante App' },
});

// Exigir MFA para admins
if (profile.role === 'admin' && !user.factors.some((f) => f.status === 'verified')) {
  throw new Error('MFA obrigatório para admins');
}
```

#### ✅ BOM: Session Validation

- RLS policies validam `auth.uid()`
- `company_id` verificado em operações críticas

---

### A08 - Software and Data Integrity Failures

#### ✅ BOM: Webhook Signature Verification (HMAC-SHA256)

**Localização:** `database-backup/supabase/functions/billing-webhook/index.ts:120-140`

```typescript
function verifySignature(signature: string, rawBody: string, secret: string): void {
  const computedHmac = /* HMAC-SHA256 */;
  const diff = /* constant-time comparison */;
  if (diff !== 0) throw new HttpError(401, 'Invalid webhook signature');
}
```

#### ✅ BOM: CI/CD Security Gate

**Localização:** `.github/workflows/security.yml:12-30`

```yaml
jobs:
  security:
    name: Security Checks
    runs-on: ubuntu-latest
    steps:
      - Run Gitleaks
      - Snyk Scan
      - Trivy Scan
      - npm audit
  deploy:
    needs: security # ← Bloqueia deploy se security falhar
    if: success()
```

---

### A09 - Logging and Monitoring Failures

#### ⚠️ MÉDIA: Logging Incompleto de Operações Críticas

**Problema:** Nem toda operação de billing ou acesso sensível é auditada

**Severidade:** MÉDIA  
**Localização:** `restaurante-ops/src/lib/logger.ts` + `billing_audit_log`

**Correção:**

```typescript
// OBRIGATÓRIO em TODA operação sensível:
await auditBillingEvent('billing.checkout.requested', {
  status: 'initiated',
  amount_cents: 14900,
  timestamp: new Date().toISOString(),
  // user_id e company_id adicionados automaticamente
});

// Verificar logs:SELECT * FROM billing_audit_log ORDER BY created_at DESC;
```

#### ✅ BOM: Audit Trail Imutável para LGPD

**Localização:** `database-backup/migrations/20260323170000_create_lgpd_dsar_infrastructure.sql`

```sql
CREATE TABLE billing_audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT,
  user_id UUID,
  company_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Retenção: 3 anos conforme LGPD Art. 16
```

#### ✅ BOM: Error Handling Seguro

**Localização:** `database-backup/supabase/functions/_shared/auth-secure.ts:30-50`

```typescript
export class HttpError extends Error {
  internalMessage?: string; // Nunca exposto ao cliente
  constructor(status, clientMessage, internalMessage?) {
    super(clientMessage); // ← Cliente recebe genérico
    this.internalMessage = internalMessage; // ← Server logs detalhado
  }
}

// Cliente recebe: "Unauthorized"
// Server logs: "[AUTH] User 123e4567-e89b-12d3-a456-426614174000 not found"
```

---

### A10 - Server-Side Request Forgery (SSRF)

#### ✅ BOM: Webhook endpoint com validação de source

**Localização:** `database-backup/supabase/functions/billing-webhook/index.ts`

```typescript
// Verifica HMAC signature de Mercado Pago antes de processar
// Previne SSRF/webhook injection
```

#### ⚠️ MÉDIA: API requests sem timeout

**Severidade:** MÉDIA  
**Correção:**

```typescript
// Edge Functions: Sempre usar timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000), // 5s timeout
  headers: {
    /* ... */
  },
});
```

---

## 3️⃣ AUTENTICAÇÃO E AUTORIZAÇÃO

### 3.1 JWT

| Aspecto           | Status | Detalhes                                               |
| ----------------- | ------ | ------------------------------------------------------ |
| **Issuador**      | ✅     | Supabase Auth (OIDC compliant)                         |
| **Assinatura**    | ✅     | RS256 (asymmetric)                                     |
| **Expiração**     | ✅     | 3600s (1h), refresh automático                         |
| **Refresh Token** | ✅     | SecureStore (mobile), AsyncStorage (web)               |
| **Revogação**     | ⚠️     | Logout apaga session, mas JWT ainda válido até expirar |
| **Validação**     | ✅     | RLS policies validam em cada query                     |

### 3.2 RBAC (Role-Based Access Control)

```
Roles Implementados:
├── admin
│   ├── Acesso: Todas as operações + billing
│   ├── Validação: profile.role === 'admin'
│   └── MFA: ❌ Não obrigatório (CRÍTICO)
├── manager
│   ├── Acesso: Pedidos, caixa, estoque, relatórios
│   ├── Validação: profile.role === 'manager'
│   └── Limitações: Não acessa billing
├── employee
│   ├── Acesso: Leitura de pedidos, operações limitadas
│   └── Limitações: Sem acesso a relatórios
├── caixa
│   ├── Acesso: Caixa, movimentações
│   └── Limitações: Sem acesso a estoque
└── cozinheiro
    ├── Acesso: Apenas pedidos
    └── Limitações: Sem acesso a dados financeiros
```

**RLS Policies por Role:**

| Tabela          | SELECT          | INSERT       | UPDATE       | DELETE       | Condition        |
| --------------- | --------------- | ------------ | ------------ | ------------ | ---------------- |
| profiles        | auth.uid() = id | ❌           | Self only    | ❌           | ✅               |
| clientes        | ✅              | Company      | Company      | Company      | company_id match |
| comandas        | ✅              | Company      | -            | -            | company_id match |
| orders          | ✅              | Company      | Company      | Company      | company_id match |
| cash_movements  | ✅              | Admin        | Admin        | **Admin**    | ✅               |
| invoices        | Company admin   | ❌           | service_role | ❌           | ✅               |
| payment_methods | Admin only      | service_role | service_role | service_role | ✅               |
| webhook_events  | ❌              | service_role | service_role | service_role | ❌ client access |

### 3.3 Multi-Tenancy (company_id Isolation)

**Status:** ✅ BOM (com caveats)

```
Profile Query:
  company_id ← De auth.uid() via profiles table

Operação de Pedido:
  1. Usuario solicita acesso a pedido X
  2. RLS verifica: company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  3. Se match → permissão concedida
  4. Se não match → 0 linhas retornadas (DENY silencioso)
```

**Problema:** `GET /profiles` retorna TODOS os profiles (RLS `USING (true)`)

---

## 4️⃣ VALIDAÇÃO DE DADOS

### 4.1 Sanitização

| Input             | Validação      | Sanitização                | Status |
| ----------------- | -------------- | -------------------------- | ------ |
| Nome Cliente      | Regex + length | `sanitizeString()`         | ✅     |
| Email             | Regex          | `sanitizeString()`         | ✅     |
| Observações       | Max 500 chars  | `sanitizeString()`         | ✅     |
| Preço             | Number type    | Number coercion            | ✅     |
| UUID (company_id) | Regex UUID     | Format check               | ✅     |
| JSON (webhook)    | JSON parse     | ❌ Schema validation falta | ⚠️     |

### 4.2 Validação Server-Side

**Localização:** `restaurante-web/src/utils/validation.ts`

```typescript
// ✅ Centralizado
export const validateClientName = (name): ValidationResult => {
  const sanitized = sanitizeString(name);
  if (sanitized.length < 2) error();
  if (!/[a-z]/i.test(sanitized)) error();
  return { isValid: true, value: sanitized };
};

// Cada criação de pedido passa por validateCompleteOrder()
```

---

## 5️⃣ DATA SECURITY

### 5.1 Criptografia em Repouso

| Componente             | Criptografia        | Detalhe                            |
| ---------------------- | ------------------- | ---------------------------------- |
| Database (PostgreSQL)  | ✅ Supabase         | Disk encryption at rest (AWS)      |
| Tokens (Mobile)        | ✅ Expo SecureStore | iOS Keychain, Android Keystore     |
| Tokens (Web)           | ⚠️ AsyncStorage     | Browser storage (vulnerable a XSS) |
| Backups                | ❌ Não verificado   | Scripts não mencionam encryption   |
| Edge Functions Secrets | ✅ Supabase Vault   | Deno env.get() encriptado          |

### 5.2 Criptografia em Trânsito

| Canal                    | Protocol       | Status |
| ------------------------ | -------------- | ------ |
| App → Supabase           | HTTPS/TLS 1.2+ | ✅     |
| Web → Supabase           | HTTPS/TLS 1.2+ | ✅     |
| Edge Function → Supabase | HTTPS          | ✅     |
| Webhook (MP → EF)        | HMAC-SHA256    | ✅     |

### 5.3 Exposição em Logs

**❌ CRÍTICO:** Senhas de BD estão commitadas em `backup.bat`, `restore.bat`

**⚠️ MÉDIA:** Logs de erro podem expor PII

```typescript
// ❌ RUIM (localizado em alguns pontos)
console.error(`User ${userId} not found in company ${companyId}`);

// ✅ CORRETO
console.error('[DB] Profile not found'); // Genérico
console.warn('[DEBUG]', userId, companyId); // Detalhes internamente
```

---

## 6️⃣ LGPD (Lei nº 13.709/2018)

### 6.1 Coleta de Dados

**Base Legal Identificada:**

| Dados                    | Propósito               | Base Legal                     | Retenção                     |
| ------------------------ | ----------------------- | ------------------------------ | ---------------------------- |
| Nome, Email              | Conta de usuário        | Contrato (Art. 7.I)            | Até fim da relação           |
| CPF/CNPJ                 | Pagamentos, faturamento | Obrigação legal (Art. 7.II)    | Conforme lei fiscal (5 anos) |
| Telefone                 | Entrega, contato        | Consentimento (Art. 7.VIII)    | Até fim da relação           |
| Endereço                 | Entrega                 | Consentimento                  | Até fim da relação + DSAR    |
| Comportamento de Pedidos | Melhorias, analytics    | Interesse legítimo (Art. 7.IX) | Agregado, anonimizado        |

### 6.2 Direitos do Titular (Art. 18-20)

| Direito                            | Implementação                                | Status               |
| ---------------------------------- | -------------------------------------------- | -------------------- |
| Acesso (Art. 18.I)                 | DSAR request → CSV export                    | ✅ Implementado      |
| Correção (Art. 18.II)              | API de update perfil                         | ✅                   |
| Eliminação (Art. 18.III)           | `anonymize_customer_by_phone()` SQL function | ✅                   |
| Portabilidade (Art. 18.IV)         | CSV download (estrutura standardizada?)      | ⚠️ Verificar formato |
| Não Decisão Automatizada (Art. 20) | N/A (sem ML)                                 | ✅                   |

### 6.3 Retenção e Descarte

**Localização:** `docs/LGPD/LGPD-DATA-RETENTION-POLICY.md`

```
Dados de Clientes (Pessoas Físicas):
  - Ativos: Mantidos enquanto conta ativa
  - Inativos (>12 meses): Anonimizar automaticamente
  - DSAR request: Gerar relatório, depois anonimizar se solicitado

Dados de Transações/Pedidos:
  - Reteno obrigatória: 5 anos (lei fiscal - RFB)
  - Após 5 anos: Anonimizar CPF, manter dados agregados

Logs de Acesso:
  - Retenção: 3 anos (requisito de auditoria)
  - Encryption: Supabase + audit_log table (imutável)

Backups:
  - Retenção: ❌ Não especificado
  - Destruction: ❌ Não documentado
```

**Severidade:** ⚠️ MÉDIA - Política existe, mas implementação de destruição automática falta

### 6.4 Segurança dos Dados

**Status:** ✅ BOM

- RLS policies isolam por company_id
- Senhas em SecureStore
- HTTPS/TLS em trânsito
- Audit log imutável para compliance

**Problemas:**

- ❌ Backup strategy não menciona encryption ou secure disposal
- ❌ Falta de Data Protection Impact Assessment (DPIA)

### 6.5 Consentimento

**Implementação:**

- Privacy notice in-app: ✅ Existe (docs/LGPD/LGPD-PRIVACY-NOTICE.md)
- Consentimento explícito: ⚠️ Usar em checkout para email marketing
- Revogação: ✅ "Parar emails" funcionalidade

---

## 7️⃣ FRONTEND / MOBILE

### 7.1 Armazenamento Local

| Item          | Mobile           | Web              | Status                  |
| ------------- | ---------------- | ---------------- | ----------------------- |
| JWT Token     | Expo SecureStore | AsyncStorage     | ⚠️ Web vulnerable a XSS |
| Refresh Token | Expo SecureStore | AsyncStorage     | ⚠️ Web vulnerable a XSS |
| Session Data  | SecureStore      | localStorage     | ✅                      |
| Sensitive PII | ❌ Não armazenar | ❌ Não armazenar | ✅                      |

### 7.2 Token Management

```typescript
// ✅ BOM
const supabase = createClient(url, key, {
  auth: {
    storage: SecureStorageAdapter, // Moblie = SecureStore, Web = AsyncStorage
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Logout limpa storage
await supabase.auth.signOut(); // Remove tokens
```

### 7.3 HTTPS / Certificate Pinning

| Aspecto             | Status | Detalhes                           |
| ------------------- | ------ | ---------------------------------- |
| HTTPS               | ✅     | Supabase + Railway (HTTP redirect) |
| Certificate Pinning | ❌     | Não implementado                   |
| Public Key Pinning  | ❌     | Não implementado                   |

**Severidade:** ⚠️ MÉDIA - Mobile sem pinning é vulnerável a MITM em WiFi público

**Correção:**

```typescript
// Use: axios-https-proxy-agent + certificate pinning library
// ou configure em EAS build (native plugins)
import { SecurityClient } from 'react-native-https-proxy-agent';
const client = new SecurityClient({
  certificatePath: require('./certs/supabase.pem'),
});
```

### 7.4 XSS Protection

- ✅ React escapa por default `{}`
- ✅ `sanitizeString()` em inputs
- ⚠️ Falta CSP header

---

## 8️⃣ BACKEND

### 8.1 Validação de Requests

| Aspecto                 | Status | Detalhes                                   |
| ----------------------- | ------ | ------------------------------------------ |
| Method validation       | ✅     | Edge functions checam (GET, POST, OPTIONS) |
| Content-Type validation | ✅     | Checa `application/json`                   |
| Body schema validation  | ⚠️     | Falta Zod/joi em alguns endpoints          |
| Query params            | ✅     | Sanitizados via RLS                        |
| Headers                 | ✅     | JWT validation obrigatório                 |

### 8.2 Rate Limiting

| Tipo          | Implementação                | Status              |
| ------------- | ---------------------------- | ------------------- |
| Client-side   | RateLimiterService (memória) | ❌ Apenas cosmético |
| Server-side   | Não detectado                | ❌ CRÍTICO          |
| Edge Function | Não implementado             | ❌ CRÍTICO          |

**Severidade:** ⚠️ ALTA - Sem rate limiting no servidor, vulnerável a DoS

### 8.3 Security Headers

| Header                    | Value                  | Status |
| ------------------------- | ---------------------- | ------ |
| X-Content-Type-Options    | nosniff                | ✅     |
| X-Frame-Options           | DENY                   | ✅     |
| Strict-Transport-Security | max-age=31536000       | ✅     |
| Referrer-Policy           | same-origin            | ✅     |
| Permissions-Policy        | camera(), microphone() | ✅     |
| Content-Security-Policy   | ❌ Não encontrado      | ⚠️     |

---

## 9️⃣ DEVOPS

### 9.1 Docker / Containerização

**Status:** ❌ Não encontrado Docker configs específicos

**Recomendação:** Se usar Railway com Nixpacks, adicionar `Dockerfile` com:

- Non-root user
- Multi-stage build
- Scan de vulnerabilidades (Trivy)

### 9.2 CI/CD Security

**Localização:** `.github/workflows/security.yml`

```yaml
✅ Gitleaks (detecta secrets commitados)
✅ Snyk (vulnerabilidades npm)
✅ Trivy (scan de containers/fs)
✅ npm audit (vulnerabilidades)
```

**Gaps:**

- ❌ Falta SAST (code static analysis) tipo SonarQube
- ❌ Falta DAST (dynamic testing)
- ❌ Falta container image scanning pré-deploy

### 9.3 Secrets Management

**Status:** ⚠️ ALTA RISCO

```
Railway Secrets:
  ✅ Via Railway dashboard (encriptado)
  ❌ Senhas de BD ainda em batch files nãoGitignored

GitHub Secrets:
  ✅ SNYK_TOKEN armazenado corretamente
  ❌ Falta SUPABASE_SERVICE_ROLE_KEY
  ❌ Falta MERCADO_PAGO_API_KEY
```

**Correção:**

```bash
# 1. Remover senhas de backup.bat / restore.bat
# 2. Usar Railway env vars ou .env.local (gitignored)
# 3. Adicionar a .gitignore:
echo "*.env.local" >> .gitignore
echo "*.key *.pem *.p12" >> .gitignore

# 4. GitHub Secrets para CI/CD:
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set MERCADO_PAGO_API_KEY
gh secret set DB_BACKUP_PASSWORD
```

### 9.4 Backup & Disaster Recovery

**Status:** ⚠️ CRÍTICA

| Aspecto                | Status | Detalhes                                  |
| ---------------------- | ------ | ----------------------------------------- |
| Backup Frequency       | ✅     | Scripts `backup.sh`, `backup.bat` existem |
| Backup Encryption      | ❌     | Dumps não encriptados                     |
| Backup Storage         | ❌     | Local (`backups/`), não offsite           |
| Backup Verification    | ❌     | Sem testes de restore                     |
| Disaster Recovery Plan | ❌     | Não documentado                           |

**Severidade:** 🔴 CRÍTICA

**Correção:**

```bash
#!/bin/bash
# database-backup/backup-encrypted.sh

# 1. Backup encriptado
pg_dump -v -Fc "$SOURCE_DB" | \
  openssl enc -aes-256-cbc -salt -out "backup_$(date +%Y%m%d_%H%M%S).dump.enc"

# 2. Copiar para S3/GCS com versionamento
gsutil cp "backup_*.dump.enc" "gs://restaurante-backups/prod/"

# 3. Test restore mensal
pg_restore --list "backup_latest.dump" > /dev/null || \
  echo "BACKUP CORRUPTED" | mail -s "⚠️ Backup verification failed" ops@restaurante.com
```

---

## 🔟 DEPENDÊNCIAS

### 10.1 Vulnerabilidades Detectadas

**Via Snyk/Trivy em security.yml:** Executar `npm audit` para lista completa

```bash
npm audit | grep -E "CRITICAL|HIGH"
```

**Expectativa:** 0-2 vulnerabilidades altas (aceitável com patches mensal)

### 10.2 Supply Chain Security

| Item                | Status | Detalhes                                   |
| ------------------- | ------ | ------------------------------------------ |
| npm lockfile        | ✅     | package-lock.json (verificar commits)      |
| Dependências pinned | ⚠️     | Caret ranges (`^`) podem mover patch/minor |
| Transitive deps     | ⚠️     | Auditadas apenas com `npm audit`           |
| Private registry    | ❌     | Sem npm private packages                   |

**Recomendação:**

```json
{
  "dependencyUpdates": "auto",
  "autoPatch": true,
  "enableLockFile": true,
  "auditOnInstall": true
}
```

---

## 1️⃣1️⃣ SEGREDOS E .gitignore

### 11.1 Análise de Commits

**❌ Senhas de BD Expostas:**

```
database-backup/backup.bat:32 → REDACTED_DB_PASSWORD
database-backup/restore.bat:18 → REDACTED_DB_PASSWORD
database-backup/.env.local → REDACTED_DB_PASSWORD
```

**❌ Chaves de API Hardcodeadas:**

```
restaurante-web/e2e/*.spec.ts → [REDACTED_SUPABASE_ANON_KEY]
restaurante-web/.env.example:12 → [REDACTED_FIREBASE_API_KEY]
```

### 11.2 .gitignore Status

**Arquivo:** `.gitignore` (padrão Expo)

**O que está protegido:**

- `node_modules/`
- `.env.local` (se existe)
- `dist/` build outputs

**O que ESTÁ FALTANDO:**

```
# ❌ ADICIONAR:
database-backup/.env.local
*.key
*.pem
*.p12
.env
.env.production
.env.staging
*.dump
*.sql.bak
```

### 11.3 Gitleaks Report

```
✅ Gitleaks está configurado em CI
❌ Precisa rodar localmente:
   gitleaks detect --source . --verbose
```

---

## 📊 SCORES DE SEGURANÇA

### Segurança Overall

```
┌─────────────────────────────────┐
│ SCORE: 58/100 (CRÍTICO)         │
└─────────────────────────────────┘

Components:
├── Auth & Access Control    [50/100] ⚠️ RLS permissiva
├── Data Protection          [55/100] ⚠️ Senhas expostas
├── Input Validation         [75/100] ✅ Bom
├── API Security             [60/100] ⚠️ CORS wildcard
├── Logging & Monitoring     [70/100] ✅ Bom
├── Infrastructure           [65/100] ⚠️ Sem pinning, backups
├── DevSecOps                [70/100] ✅ Gitleaks + Snyk
└── LGPD Compliance          [65/100] ⚠️ Falta DPIA
```

### DevSecOps Score

```
┌─────────────────────────────────┐
│ SCORE: 72/100 (SATISFATÓRIO)    │
└─────────────────────────────────┘

├── CI/CD Security            [80/100] ✅
├── Secrets Management        [50/100] ❌ Hardcoded
├── Backup & Recovery         [30/100] ❌ Critical gaps
├── Dependency Scanning       [85/100] ✅
├── Container Security        [60/100] ⚠️ Falta Dockerfile
└── Deployment Automation     [80/100] ✅ Railway
```

### LGPD Compliance Score

```
┌─────────────────────────────────┐
│ SCORE: 65/100 (ACEITÁVEL)       │
└─────────────────────────────────┘

├── Legal Basis               [80/100] ✅
├── Consent Management        [70/100] ✅
├── Data Rights (DSAR)        [75/100] ✅
├── Data Protection           [55/100] ⚠️
├── Audit Trail               [75/100] ✅
├── Data Retention Policy     [70/100] ⚠️
├── Privacy by Design         [60/100] ⚠️
└── DPO / Governance          [40/100] ❌
```

---

## 🎯 TOP RISCOS CRÍTICOS

### 1️⃣ 🔴 Segredos operacionais em scripts e backups

- **Severidade:** CRÍTICA
- **Impacto:** RCE + data breach total
- **Localizações:** backup.bat, restore.bat, .env.local (se versionado)
- **Status 25/03:** mitigado no repositório; manter rotação e garantir que `.env.local` continue fora de versionamento
- **Tempo Estimado:** 2 horas

### 2️⃣ 🔴 RLS permissiva em `profiles`

- **Severidade:** CRÍTICA
- **Impacto:** User enumeration + profile disclosure
- **Localização:** Banco remoto e 20260311161100_schema_dump.sql
- **Status 25/03:** mitigado por migration de hardening aplicada; manter validação remota de `pg_policies` como evidência de produção
- **Tempo Estimado:** 30 minutos + migration + test

### 3️⃣ 🔴 Rate limiting em operações críticas de billing

- **Severidade:** ALTA
- **Impacto:** DoS/spam attacks
- **Localização:** Edge Functions (billing, webhooks)
- **Status 25/03:** mitigado em `restaurante-ops`; manter `RATE_LIMIT_FALLBACK_ENABLED=false` em produção e evidência de `429/503`
- **Tempo Estimado:** 4-6 horas

### 4️⃣ 🟠 CORS com Wildcard Fallback

- **Severidade:** ALTA
- **Impacto:** CSRF + cross-origin attacks
- **Localização:** cors.ts
- **Status 25/03:** mitigado com allowlist por origem e bloqueio explícito fora da whitelist
- **Tempo Estimado:** 2 horas

### 5️⃣ 🟠 Gate restante para billing Mercado Pago

- **Severidade:** ALTA OPERACIONAL
- **Impacto:** promoção sem evidência funcional end-to-end
- **Localização:** fluxo S1-S5 em `docs/saas-billing/operations/SMOKE-TEST-26MAR-EXECUTION-PLAN.md`
- **Ação Imediata:** executar smoke funcional controlado e registrar decisão GO/NO-GO ao final de S5
- **Tempo Estimado:** 2-3 horas

### 6️⃣ 🟠 Falta de MFA para Admins

- **Severidade:** ALTA
- **Impacto:** Account takeover
- **Solução:** Supabase Auth MFA + enforcement policy
- **Tempo Estimado:** 3-4 horas

---

## ✅ QUICK WINS (Fáceis & Alto Impacto)

### 1. Remover Senhas de Backup Scripts

**Tempo:** 30 min  
**Impacto:** CRÍTICA

```bash
# database-backup/backup.bat
# ✅ ANTES:
set SOURCE_DB_PASSWORD=REDACTED_DB_PASSWORD

# ✅ DEPOIS:
set SOURCE_DB_PASSWORD=%DB_BACKUP_PASSWORD%
# Use env var ou .env.local (gitignored)
```

### 2. Fixar RLS Policy de Profiles

**Tempo:** 1 hora  
**Impacto:** CRÍTICA

```sql
-- New migration: 20260323_fix_profiles_rls.sql
DROP POLICY authenticated_pull_profiles ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
```

### 3. Adicionar CSP Header

**Tempo:** 30 min  
**Impacto:** ALTA

```typescript
// restaurante-ops/src/index.ts
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
);
```

### 4. Habilitar MFA em Supabase

**Tempo:** 1 hora  
**Impacto:** ALTA

```typescript
// Require MFA for admin signup
if (role === 'admin') {
  const { data } = await supabase.auth.mfa.enroll({
    issuer: 'restaurante-supabase',
  });
  // Return QR code para app de autenticação
}
```

### 5. Atualizar .gitignore

**Tempo:** 15 min  
**Impacto:** ALTA

```bash
echo ".env.local" >> .gitignore
echo "*.key *.pem *.p12" >> .gitignore
git rm --cached database-backup/.env.local  # Remove from history
```

---

## 🗓️ PLANO DE AÇÃO (30 DIAS)

### Semana 1: Hotfixes (Críticos)

| Dia | Task                                   | Responsável | Tempo |
| --- | -------------------------------------- | ----------- | ----- |
| 1-2 | Remover senhas BD + rotate credenciais | DevSecOps   | 2h    |
| 2   | Corrigir RLS de profiles               | DB Admin    | 1h    |
| 3   | Rate limiting em Edge Functions        | Backend     | 6h    |
| 3   | CORS whitelist + origin validation     | Backend     | 2h    |
| 4-5 | Testar todas as mudanças + deploy      | QA          | 4h    |

**Deliverable:** Security hotfix PR + deployed to production

### Semana 2-3: Medium Priority

| Task                                     | Tempo | Status              |
| ---------------------------------------- | ----- | ------------------- |
| Implementar MFA para admins              | 4h    | Design + code       |
| Adicionar CSP headers                    | 2h    | Config + test       |
| Certificate pinning (mobile)             | 4h    | React Native config |
| SAST setup (SonarQube / Semgrep)         | 3h    | CI config           |
| DPIA (Data Protection Impact Assessment) | 8h    | Legal review        |
| Backup encryption strategy               | 6h    | Database + OPS      |

### Semana 4: Compliance & Governance

| Task                                               | Tempo | Status          |
| -------------------------------------------------- | ----- | --------------- |
| DPO assignment                                     | 2h    | HR              |
| Privacy policy update                              | 4h    | Legal           |
| Data retention automation                          | 8h    | Database + cron |
| Vendor security assessment (Supabase, Railway, MP) | 6h    | Procurement     |
| Security training team                             | 4h    | All hands       |

---

## 📋 CHECKLIST PRÉ-DEPLOY (TODA ENTREGA)

```
[ ] npm audit - sem HIGH + CRITICAL
[ ] Gitleaks detect - sem secrets
[ ] Snyk scan - sem CRITICAL
[ ] RLS policies testadas (multi-tenant isolation)
[ ] JWT token validation
[ ] Rate limiting server-side
[ ] CORS origin whitelist
[ ] Security headers presentes
[ ] Audit logging de operações sensíveis
[ ] Secrets em variáveis de ambiente (não hardcoded)
[ ] Database backups tested
[ ] LGPD DSAR endpoint funcionando
[ ] Error messages sanitizadas (sem PII)
[ ] E2E tests passando (Playwright)
[ ] Code review + security approval
[ ] Deploy com validacao controlada em producao (sem staging dedicado) e rollout guardado
```

---

## 🔗 REFERÊNCIAS

### OWASP

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS 4.0](https://github.com/OWASP/ASVS)

### LGPD

- [Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD Guia de Implementação](https://anpd.gov.br/)

### Standards

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001:2022](https://www.iso.org/standard/27001)
- [PCI DSS 4.0](https://www.pcisecuritystandards.org/)

### Ferramentas

- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Snyk](https://snyk.io/)
- [Trivy](https://trivy.dev/)
- [OWASP ZAP](https://www.zaproxy.org/)

---

## 📞 PRÓXIMOS PASSOS

1. **Hoje:** Triage de críticos + assign ownership
2. **Semana 1:** Deploy hotfixes + security audit review
3. **Semana 2-4:** Medium/Low priority + compliance setup
4. **Mensal:** Repeat security audit + dependency updates
5. **Trimestral:** Penetration testing + threat modeling

**Contato:** security@restaurante.com  
**Escalation:** CTO / Director of Engineering

---

**Relatório Confidencial - Distribuição Restrita**  
**Última Atualização:** 2026-03-23  
**Próxima Auditoria Recomendada:** 2026-06-23
