# 🔐 Política de Segurança - Mercado Pago SaaS Billing

**Autor:** Engineering Team  
**Data:** Março 2026  
**Status:** ATIVO - Implementação obrigatória

## 1. PRINCÍPIOS DE SEGURANÇA CRÍTICOS

### 1.1 Sem Bypass de Segurança
- ❌ PROIBIDO: Modo de teste com `X-Test-Mode` ou similares
- ❌ PROIBIDO: Hardcoded test credentials
- ❌ PROIBIDO: Endpoints que aceitam "admin mode" sem JWT
- ✅ OBRIGATÓRIO: Autenticação JWT em produção sempre

### 1.2 Multi-Tenant Isolation (PCI DSS Requirement)
- ✅ OBRIGATÓRIO: Validar `company_id` em CADA operação
- ✅ OBRIGATÓRIO: Usuário só pode acessar dados da sua própria empresa
- ✅ OBRIGATÓRIO: Nunca confiar em `company_id` do cliente - usar do JWT

```typescript
// ✅ CORRETO
const userCompanyId = profile.company_id; // Do JWT validado
if (requestedCompanyId !== userCompanyId) {
  throw new HttpError(403, 'Access denied');
}

// ❌ ERRADO
const userCompanyId = req.body.company_id; // Confiança no cliente!
```

### 1.3 Nunca Expor Dados Sensíveis em Respostas de Erro
- ❌ Nunca: "User ID 123-456 not found"
- ❌ Nunca: "Database connection failed: timeout"
- ❌ Nunca: Expor stack traces ao cliente
- ✅ OBRIGATÓRIO: Mensagens genéricas ao cliente + logs detalhados no servidor

```typescript
// ❌ ERRADO
throw new HttpError(401, `Auth failed: ${userError.message}`);

// ✅ CORRETO
console.warn('[AUTH_FAILURE]', userError.message); // Logs server-side
throw new HttpError(401, 'Unauthorized request.'); // Msg genérica
```

### 1.4 Função requireSecureAdmin Obrigatória
Todas as Edge Functions de billing DEVEM usar:

```typescript
const { adminClient, profile, auditBillingEvent } = await requireSecureAdmin(req);
```

Esta função garante:
1. ✅ JWT válido e signed pela Supabase
2. ✅ Usuário autenticado no sistema
3. ✅ Usuário tem role `admin`
4. ✅ company_id é UUID válido (prevents injection)
5. ✅ Audit log de acesso concedido

---

## 2. DADOS SENSÍVEIS - NUNCA ARMAZENAR/EXPOR

### 2.1 Dados que NUNCA devem estar em:
- Logs (exceto hashes de IDs)
- Respostas HTTP
- Mensagens de erro
- Audit logs (usar `sanitizeAuditDetails()`)

**Lista de dados proibidos:**
- Números de cartão de crédito (nenhum dígito)
- CVV/CVC
- Tokens de pagamento
- Senhas / JWTs completos
- CPF, CNPJ, RG
- EMAIL completo (usar `user@...com`)
- Telefone
- Endereço residencial/comercial
- Chaves de API (Mercado Pago, etc.)

### 2.2 Dados SEGUROS para armazenar/expor:
- ✅ Empresa ID (UUID)
- ✅ Usuário ID (UUID)
- ✅ Transaction ID (hash)
- ✅ Status de pagamento (pendente, aprovado, rejeitado)
- ✅ Último 4 dígitos do cartão (com prefixo *)
- ✅ Tipo de cartão (Visa, Mastercard, etc.)
- ✅ Data de expiração (MÊS/ANO, nunca dia exato)

---

## 3. VALIDAÇÕES OBRIGATÓRIAS

### 3.1 UUID Validation
```typescript
// OBRIGATÓRIO para company_id, user_id, subscription_id, etc.
function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

### 3.2 Authorization Header Format
```typescript
// OBRIGATÓRIO: "Bearer <token>" format
if (!authorization.toLowerCase().startsWith('bearer ')) {
  throw new HttpError(401, 'Invalid format');
}
```

### 3.3 Request Body Sanitization
```typescript
// Sempre parse com catch, nunca assuma formato
const payload = await req.json().catch(() => ({}));

// Validar cada campo
if (payload.amount && typeof payload.amount !== 'number') {
  throw new HttpError(400, 'Invalid amount');
}
```

### 3.4 SQL Injection Prevention
- ✅ Usar sempre Supabase SDK `.eq()`, `.select()`, etc
- ❌ NUNCA concatenar strings em queries
- ✅ Use named parameters:
  ```typescript
  .eq('company_id', companyId) // ✅ Safe
  ```

---

## 4. AUDIT LOGGING OBRIGATÓRIA

### 4.1 O QUE LOGAR (Server-side)
```typescript
// OBRIGATÓRIO em cada operação de billing
await auditBillingEvent('billing.checkout.requested', {
  status: 'initiated',
  amount_cents: 14900, // ✅ Sem ponto decimal
  timestamp: new Date().toISOString(),
  // empresa_id e user_id são adicionadas automaticamente
});
```

### 4.2 O QUE NUNCA LOGAR
- ❌ Card numbers (nenhum dígito)
- ❌ Tokens de autenticação completos
- ❌ Senhas
- ❌ CPF/CNPJ/RG completos
- ❌ Emails completos (usar prefix truncated)

### 4.3 Eventos Críticos a Logar
```
CRITICAL EVENTS:
- auth.admin_access_granted -> Sucesso na auth
- auth.admin_access_denied -> Falha na auth
- auth.multi_tenant_violation_attempt -> Tentativa XSS/injection
- billing.checkout.requested -> Usuário iniciou checkout
- billing.payment.webhook_received -> Webhook do Mercado Pago
- billing.payment.confirmed -> Pagamento confirmado
- billing.payment.failed -> Pagamento rejeitado
- billing.audit_anomaly -> Padrão anômalo detectado
```

---

## 5. CONFORMIDADE PCI DSS

### 5.1 Checklist
- ✅ Não armazenar números de cartão completos
- ✅ Não armazenar CVV
- ✅ Usar tokenização (Mercado Pago handles this)
- ✅ Criptografar dados em trânsito (HTTPS only)
- ✅ Audit logging de acesso a dados de pagamento
- ✅ Controle de acesso baseado em papel (admin only)
- ✅ Validação de entrada (UUID, quantidade, etc.)

### 5.2 Dados Permitidos Armazenar
- `mp_customer_id` (Mercado Pago customer reference)
- `mp_plan_id` (subscription plan na MP)
- `mp_subscription_id` (subscription na MP)
- `payment_method_token` (tokenized, nunca número real)
- Último 4 dígitos do cartão + tipo (com sanitização)

---

## 6. IMPLEMENTAÇÃO EM EDGE FUNCTIONS

### 6.1 Template Obrigatório
```typescript
import { requireSecureAdmin, validateCompanyContext, jsonResponse, HttpError } from '../_shared/auth-secure.ts';

Deno.serve(async (req) => {
  try {
    // STEP 1: Require admin auth (no test mode!)
    const { adminClient, profile, auditBillingEvent } = await requireSecureAdmin(req);
    
    const payload = await req.json().catch(() => ({}));
    const companyId = payload.companyId || profile.company_id;

    // STEP 2: Validate multi-tenant access
    if (!validateCompanyContext(profile.company_id, companyId)) {
      await auditBillingEvent('auth.multi_tenant_violation', { companyId });
      return jsonResponse(403, { error: 'Access denied' });
    }

    // STEP 3: Perform operation with auditBillingEvent logging

    // STEP 4: Return sanitized response (no sensitive data)
    return jsonResponse(200, { success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    // Never expose internal error to client
    console.error('Unexpected error:', error);
    return jsonResponse(500, { error: 'An error occurred' });
  }
});
```

### 6.2 NUNCA fazer isto:
```typescript
// ❌ Aceitar `admin` como header
if (req.headers.get('X-Admin') === 'true') { ... }

// ❌ Test mode com header
if (req.headers.get('X-Test-Mode') === 'true') { ... }

// ❌ Expor company_id em erro
throw new HttpError(403, `Access denied for company ${companyId}`);

// ❌ Logar cardData completo
console.log('Card:', cardData); // NUNCA!

// ❌ Confiar em user_id do cliente
const userId = req.body.user_id; // NUNCA!
const userId = profile.id; // ✅ CORRETO (do JWT)
```

---

## 7. CHECKLIST DE SEGURANÇA PRÉ-DEPLOY

**Antes de fazer deploy de qualquer Edge Function de billing:**

- [ ] Usa `requireSecureAdmin()` (não `requireAdmin()`)
- [ ] Sem `X-Test-Mode` ou similares
- [ ] Sem hardcoded test credentials
- [ ] Valida `company_id` com `validateCompanyContext()`
- [ ] Todos os erros são sanitizados (não expõem detalhes internos)
- [ ] Audit log de todos os eventos críticos
- [ ] Sem logging de dados sensíveis (cards, JWTs, tokens)
- [ ] Valida todos inputs (UUID format, amount type, etc.)
- [ ] Mensagens de erro genéricas ao cliente
- [ ] Stack traces nunca são expostos ao cliente
- [ ] Usou `jsonResponse()` com headers de segurança corretos
- [ ] Testou acesso multi-tenant (user A não vê dados de user B)

---

## 8. RECURSOS DE REFERÊNCIA

- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [Mercado Pago Security](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro)

---

## 9. VIOLAÇÕES DE SEGURANÇA - REPORTAR

Qualquer violação desta política:
1. Parar deploy imediatamente
2. Reportar ao tech lead
3. Documentar na issue correspondente
4. Code review focado em segurança

**Este documento é vinculante para todo código de billing.**
