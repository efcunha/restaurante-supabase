# 🔧 PLANO DE REMEDIAÇÃO DETALHADO
## Projeto: restaurante-supabase

**Data:** 23 de março de 2026  
**Objetivo:** Remediação de 5 vulnerabilidades CRÍTICAS em 7 dias

---

## CRÍTICO #1: Senhas de Banco de Dados Expostas ⏱️ 2 HORAS

### 1. Diagnóstico
```bash
# Buscar todas as ocorrências
grep -r "REDACTED_DB_PASSWORD" database-backup/
grep -r "db_password\|PASSWORD\|password" database-backup/ | grep -v ".sql\|.md"
```

**Arquivos Afetados:**
- `database-backup/backup.bat` (linha 32)
- `database-backup/restore.bat` (linha 18)
- `database-backup/.env.local` (se já existia com segredo)

### 2. Ação Imediata (HOJE)

#### 2.1 Rotate Database Credentials
```bash
# 1. Change Postgres password no Supabase Dashboard
# → Database Settings → Change database password
# → Gere NEW_PASSWORD aleatória (32+ chars)

# 2. Update Railway env vars
railway variables set DATABASE_PASSWORD="<NEW_PASSWORD>"

# 3. Teste conexão
psql -h <supabase-host> -U postgres -c "SELECT version();"
```

#### 2.2 Remover Senhas de Arquivos
```bash
# database-backup/backup.bat
# ANTES:
# set SOURCE_DB_PASSWORD=REDACTED_DB_PASSWORD

# DEPOIS:
# Use environment variable
set SOURCE_DB_PASSWORD=%DATABASE_PASSWORD%
# ou .env.local: 
# source .env.local && $SOURCE_DB_PASSWORD
```

#### 2.3 Limpar Histórico Git
```bash
# Ferramenta: git-filter-repo (não bfg)
pip install git-filter-repo

# Remove password from entire history
git filter-repo --replace-text <(echo "REDACTED_DB_PASSWORD==>REDACTED") --force

# ⚠️ FORÇA: Todos devem re-clone
git push --mirror  # Update all refs
```

#### 2.4 Criar Novo Sistema de Secrets
```bash
# database-backup/.env.local (gitignored)
SOURCE_DB_HOST=db.example.com
SOURCE_DB_PORT=5432
SOURCE_DB_PASSWORD=${DATABASE_PASSWORD}  # From Railway
SOURCE_DB_DBNAME=restaurante_prod

# db-backup.sh usa:
source .env.local 2>/dev/null || {
  echo "[ERROR] .env.local not found. Use Railway secrets."
  exit 1
}
export PGPASSWORD=$SOURCE_DB_PASSWORD
```

### 3. Validação
```bash
# ✅ Confirmar: Sem senha hard-coded
git log -p -S "A13546289b" -- database-backup/

# ✅ Confirmar: Arquivo restaurado
cat database-backup/backup.bat | grep -c "DATABASE_PASSWORD"
# Expected: 1 match (env var)

# ✅ Confirmar: Teste de backup
./database-backup/backup.sh --test
```

### 4. Comunicação
- [ ] Notificar time: "DB credentials rotated, re-authenticate"
- [ ] Update runbook: `database-backup/README.md`
- [ ] Security incident log (interno)

---

## CRÍTICO #2: Corrigir RLS de `profiles` ⏱️ 1 HORA

### 1. Problema
```sql
-- ✅ CONFIRMADO NO BANCO REMOTO E NO SNAPSHOT BASE
CREATE POLICY "authenticated_pull_profiles" ON "public"."profiles"
FOR SELECT TO "authenticated" USING (true);
-- Qualquer usuário logado lê TODOS os profiles.
```

Validado no banco remoto via `pg_policies`: `authenticated_pull_profiles | SELECT | {authenticated} | true`.

Também foi confirmado drift de roles em `profiles_role_check`, ainda limitado a `admin`, `manager`, `waiter` e `kitchen` no banco remoto.

### 2. Remediação

#### 2.1 Evidência remota
```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';
```

#### 2.2 Criar Migration
```bash
cd database-backup/migrations
cat > 20260323_fix_profiles_rls.sql << 'EOF'
-- Drop insecure policy
DROP POLICY IF EXISTS "authenticated_pull_profiles" ON "public"."profiles";

-- Create secure policy: users can only read their own profile
CREATE POLICY "authenticated_read_own_profile" ON "public"."profiles"
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Existing UPDATE policy (self-only) stays
-- CREATE POLICY "authenticated_update_own_profile" ON "public"."profiles"
--   FOR UPDATE TO "authenticated" USING (auth.uid() = id);
EOF
```

#### 2.3 Apply Locally
```bash
# Test in local Supabase
supabase db push

# Verify
supabase db status
```

#### 2.3 Deploy to Production
```bash
# Apply to production Supabase
SUPABASE_DB_PASSWORD=${DB_PROD_PASSWORD} \
SUPABASE_URL=${SUPABASE_URL} \
SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
supabase db push --db-remote prod
```

### 3. Validação - Testes Críticos

```typescript
// test/profiles-rls.spec.ts
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Profiles RLS Security', () => {
  
  test('User A cannot read User B profile', async () => {
    // User A session
    const clientA = createClient(URL, KEY, {
      auth: { /* User A JWT */ }
    });
    
    // Try to fetch User B's profile
    const userBId = '550e8400-e29b-41d4-a716-446655440000';
    const { data, error } = await clientA
      .from('profiles')
      .select('*')
      .eq('id', userBId)
      .single();
    
    // ✅ Should fail (0 rows due to RLS)
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  test('User can read their own profile', async () => {
    const clientA = createClient(URL, KEY, {
      auth: { /* User A JWT */ }
    });
    
    const { data, error } = await clientA
      .from('profiles')
      .select('*')
      .single();
    
    // ✅ Should succeed
    expect(error).toBeNull();
    expect(data.id).toBe(userA.id);
  });
  
});
```

### 4. Commit & Deploy
```bash
git add database-backup/migrations/20260323_fix_profiles_rls.sql
git commit -m "fix: secure profiles RLS policy (CVE-2026-xxxxx)"
git push origin security/rls-fix

# PR review + merge
gh pr create --title "🔒 Fix: Profiles RLS Security" \
  --body "Removes overly permissive authenticated_pull_profiles policy"
```

---

## ALTA #3: Rate Limiting no Servidor ⏱️ 6 HORAS

### 1. Problema
- Client-side rate limiting é apenas cosmético
- Nenhum `billing-create-checkout` tem rate limiting
- Vulnerável a DoS/spam

### 2. Solução: Usar Supabase Functions + Redis (via Upstash)

#### 2.1 Criar Função Compartilhada
```typescript
// database-backup/supabase/functions/_shared/rate-limiter.ts
declare const Deno: any;

interface RateLimitKey {
  userId: string;
  endpoint: string;
  window?: number;  // seconds
}

export async function checkRateLimit(key: RateLimitKey, limit: number) {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_URL');
  const rateKey = `ratelimit:${key.userId}:${key.endpoint}`;
  
  const redis = await fetch(`${redisUrl}/incr/${rateKey}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('UPSTASH_TOKEN')}` }
  });
  
  const count = await redis.json();
  
  if (count === 1) {
    // First request, set TTL
    await fetch(`${redisUrl}/expire/${rateKey}/60`, {
      method: 'POST'
    });
  }
  
  if (count > limit) {
    throw new HttpError(429, 'Too many requests. Retry after 60 seconds.');
  }
  
  return {
    remaining: limit - count,
    resetIn: 60
  };
}
```

#### 2.2 Integrar em Billing Endpoint
```typescript
// database-backup/supabase/functions/billing-create-checkout/index.ts
import { checkRateLimit } from '../_shared/rate-limiter.ts';

export async function POST(req: Request) {
  const { user, profile, auditBillingEvent } = await requireSecureAdmin(req);
  
  // Rate limit: 5 checkouts per user per minute
  try {
    const rl = await checkRateLimit({
      userId: user.id,
      endpoint: 'billing-create-checkout',
      window: 60
    }, 5);
    
    console.log(`[RateLimit] Checkouts remaining: ${rl.remaining}`);
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      throw error;  // Pass 429 to client
    }
  }
  
  // Continue with checkout logic...
}
```

#### 2.3 Setup Upstash Redis
```bash
# 1. Sign up: https://upstash.com
# 2. Create database
# 3. Copy UPSTASH_REDIS_URL + UPSTASH_TOKEN
# 4. Add to Supabase secrets
supabase secrets set UPSTASH_REDIS_URL "https://..."
supabase secrets set UPSTASH_TOKEN "..."
# 5. Add to Railway
railway variables set UPSTASH_REDIS_URL UPSTASH_TOKEN
```

#### 2.4 Outras Operações com Rate Limit
```
billing-create-checkout:      5 por minuto/usuário
billing-create-pix-fallback:  10 por minuto/usuário
orders/create:                20 por minuto/usuário
login:                        5 tentativas por 15 min (brute-force)
```

### 3. Validação

```bash
# Test rate limiting
for i in {1..6}; do
  curl -X POST https://...billing-create-checkout \
    -H "Authorization: Bearer $JWT" \
    -d '{"amount": 9900}' \
    -w "\n%{http_code}\n"
done

# Expected:
# 200 ✅ requests 1-5
# 429 ⚠️ request 6 (Too Many Requests)
```

---

## ALTA #4: CORS Wildcard Fallback ⏱️ 2 HORAS

### 1. Problema
```typescript
// ❌ ACTUAL
function resolveAllowOrigin(): string {
  const origins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
  if (origins.length > 1) {
    return '*';  // ← INSECURO!
  }
  return origins[0] || '*';
}
```

### 2. Fixar

```typescript
// ✅ CORRETO
function resolveAllowOrigin(req: Request): string {
  const allowedOrigins = [
    'https://restaurante.com',
    'https://web.restaurante.com',
    'https://admin.restaurante.com',
    'http://localhost:3000',  // Dev only
  ];
  
  const origin = req.headers.get('origin') || '';
  
  // Never return wildcard if origin present
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // If origin not in whitelist, deny CORS
  return '';  // Empty = no CORS header = browser blocks
}

// Update cors response
export const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveAllowOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',  // Cache preflight 24h
});
```

### 3. Update Edge Functions
```bash
# All edge functions using cors.ts must update to:
const corsHeaders = corsModule(req);  // Pass request object
```

### 4. Test CORS
```bash
# ✅ Allowed origin
curl -H "Origin: https://restaurante.com" \
  https://...edge-function \
  -v | grep "Access-Control-Allow-Origin"
# Expected: https://restaurante.com

# ❌ Denied origin
curl -H "Origin: https://evil.com" \
  https://...edge-function \
  -v | grep "Access-Control-Allow-Origin"
# Expected: (no header or empty)
```

---

## VALIDAÇÃO FINAL: Testar Stack Completo

```bash
# 1. Unit tests
npm test

# 2. E2E tests
npm run test:e2e

# 3. Security scan
gitleaks detect --source .
snyk test

# 4. Manual testing
# - Login app/web
# - Testar RLS (user A vs B)
# - Testar rate limiting (6x checkout)
# - Testar CORS (allowed + denied origins)
# - Testar audit logs (billing_audit_log table)
```

---

## DEPLOYMENT CHECKLIST

```
[ ] Backup DB antes de qualquer mudança
[ ] Test em staging environment primeiro
[ ] Migration applied locally
[ ] Tests passam
[ ] Code review + Security approval
[ ] Deploy migrations to production
[ ] Secrets rotated
[ ] Monitoring + alertas ativos
[ ] Team notificado
[ ] Incident log atualizado
```

---

## ROLLBACK PLAN

Se algo der errado:

```bash
# 1. Revert migration (Supabase)
supabase db reset --local
# ou
# Manualmente reset RLS no dashboard

# 2. Revert environment variables
railway variables set SOURCE_DB_PASSWORD "<OLD_VALUE>"

# 3. Revert code
git revert <commit-hash>
git push

# 4. Monitoring
# Check logs em Supabase + Railway + Sentry
```

---

## Próximas Vulnerabilidades (Semana 2)

1. ⚠️ ALTA: MFA obrigatório para admins (4h)
2. ⚠️ ALTA: Certificate pinning mobile (4h)
3. ⚠️ ALTA: SAST setup (SonarQube) (3h)
4. ⚠️ MÉDIA: Backup encryption (6h)
5. ⚠️ MÉDIA: CSP headers (2h)

