# 📋 IMPLEMENTAÇÃO LGPD PARA O TIME
## Guia Prático de Compliance com LGPD (Lei 13.709/2018)

**Data:** 23 de março de 2026  
**Público:** Développeurs, DPO, Product, Legal  
**Objetivo:** Implementar security by design conforme LGPD

---

## 1. PILARES DA LGPD

```
┌─────────────────────────────────────────────────────────────┐
│ LEI Nº 13.709/2018 - LGPD (General Data Protection Law)     │
├─────────────────────────────────────────────────────────────┤
│ 1. Transparência       → Avisos + Política de Privacidade   │
│ 2. Consentimento       → Consentir para marketing           │
│ 3. Direitos do Titular → Acessar, deletar, corrigir        │
│ 4. Segurança           → Criptografia + RLS + Audit Log    │
│ 5. Responsabilidade    → Controller + Processor + DPO      │
│ 6. Retenção de Dados   → Limpar após 5 anos                │
│ 7. Notificação         → Avisar autoridades se breach       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. MAPEAMENTO DE DADOS PESSOAIS

### 2.1 Tipos de Dados Coletados

| Dados | Onde? | Por quê? | Base Legal | Retenção |
|-------|-------|---------|-----------|----------|
| Email + Senha | Login | Autenticação | Contrato (Art 7.I) | Até saída |
| CPF/CNPJ | Pagamento | Identificação fiscal | Lei fiscal | 5 anos |
| Nome | Pedido | Identificar cliente | Contrato | Até saída + DSAR |
| Telefone | Entrega | Contato | Consentimento (Art 7.VIII) | Até saída |
| Endereço | Entrega | Logística | Contrato | Até saída |
| Comportamento | Pedidos | Análise + recomendações | Interesse legítimo (Art 7.IX) | Agregado, anonimizado |
| IP / Device | Logs | Segurança | Interesse legítimo | 1 ano |

### 2.2 Classificação de Risco

```
🔴 ALTÍSSIMO RISCO:
   - CPF/CNPJ completo
   - Cartão de crédito (nunca! usar processor)
   - Senhas

🟠 ALTO RISCO:
   - Email completo
   - Telefone completo
   - Endereço residential

🟡 MÉDIO RISCO:
   - Comportamento de pedidos
   - IP address
   - Device ID

🟢 BAIXO RISCO:
   - ID anonimizado (UUID)
   - Status de pedido
   - Agregados (total vendas/mês)
```

---

## 3. CONSENTIMENTO (LGPD Art. 7 + 8)

### 3.1 Tipos de Base Legal

```
Art. 7.I    → CONTRATO (pagamento, entrega)
Art. 7.II   → OBRIGAÇÃO LEGAL (impostos, RFB)
Art. 7.VIII → CONSENTIMENTO (newsletter, marketing)
Art. 7.IX   → INTERESSE LEGÍTIMO (analytics, segurança)

⚠️ IMPORTANTE: Cada coleta de dados precisa de UMA base legal!
```

### 3.2 Implementação no App

#### Newsletter / Marketing
```typescript
// ✅ Explicit consent form no checkout
<CheckboxGroup>
  <Checkbox name="newsletter">
    [ ] Gostaria de receber promoções e atualizações por email
  </Checkbox>
</CheckboxGroup>

// Never pre-checked! ✅
<Checkbox name="newsletter" defaultChecked={false}>
```

#### Privacy Notice (Aviso de Privacidade)
**Localização:** App → Settings → Privacy, Checkout (final step)

```
🔐 AVISO DE PRIVACIDADE

Nós coletamos seus dados para:
✓ Processar seus pedidos
✓ Entregar seu pedido  
✓ Processar pagamentos (via Mercado Pago)
✓ Melhorar nossos serviços

Base legal: Contrato (Art. 7.I) e Consentimento (Art. 7.VIII)

Seus direitos:
📋 Acessar seus dados → privacy@restaurante.com
✂️ Deletar seus dados → Ir para Settings
📧 Parar de receber emails → Link no footer de cada email
👁️ Ver nossa política completa → Link

Retenção: Mantemos seus dados até você solicitar exclusão.
Dados fiscais são retidos por 5 anos (lei).

Contato DPO: dpo@restaurante.com
```

### 3.3 Registro de Consentimento

**Tabela:** `consent_audit`
```sql
CREATE TABLE consent_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),
  consent_type TEXT,  -- 'newsletter', 'marketing', 'analytics'
  version INT,  -- Policy version (in case of updates)
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Quando registrar:**
```typescript
// Ao clicar em "concordo" na privacy notice
const supa = createClient(...);
await supa.from('consent_audit').insert({
  user_id: user.id,
  company_id: profile.company_id,
  consent_type: 'newsletter',
  version: 1,
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});
```

---

## 4. DIREITOS DO TITULAR (LGPD Art. 18-20)

### 4.1 DSAR (Data Subject Access Request)

#### Implementação
```typescript
// Feature: Settings → Privacy → Request My Data
const requestDSAR = async (userId: string) => {
  const { data: dsar } = await supabase
    .from('lgpd_dsar_requests')
    .insert({
      user_id: userId,
      status: 'pending',
      requested_at: new Date(),
      email_notification: true
    })
    .select()
    .single();
  
  // Email user confirmation
  await sendEmail(user.email, {
    subject: 'LGPD - Confirmamos seu pedido de acesso a dados',
    body: `Seu pedido foi recebido. Você receberá seus dados em até 30 dias.`
  });
  
  return dsar;
};
```

#### Processamento (Backend)
```sql
-- 1. Usuário solicita → lgpd_dsar_requests.status = 'pending'
-- 2. DPO valida (manualmente) → status = 'approved'
-- 3. Gerar relatório:
SELECT 
  id, email, full_name, created_at,
  (SELECT COUNT(*) FROM orders WHERE user_id = p.id) as pedidos_totais,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = p.id) as total_gasto
FROM profiles p
WHERE id = :user_id AND company_id = :company_id;

-- 4. Enviar CSV + status = 'completed'
-- 5. Agendar anonimização em 30 dias
```

#### Prazo Legal
- **Resposta:** Até 30 dias (Art. 18.§1)
- **Extensão:** Pode pedir 15 dias adicionais (Art. 18.§2)

### 4.2 Direito ao Esquecimento (Deletion)

#### UI
```typescript
// Settings → Privacy → Delete My Account
const deleteAccount = async (userId: string, password: string) => {
  // 1. Validar senha
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });
  
  if (error) throw new Error('Senha incorreta');
  
  // 2. Criar DSAR de deletação
  await supabase.from('lgpd_dsar_requests').insert({
    user_id: userId,
    type: 'deletion',
    status: 'pending'
  });
  
  // 3. Email de confirmação
  await sendEmail(user.email, {
    subject: '⚠️ Confirmação de Exclusão da Conta',
    body: `Clique aqui para confirmar (link válido por 24h): ...`
  });
};
```

#### Backend Anonymization
```sql
-- Done by DPO after confirmation
-- function: anonymize_customer_by_phone()
SELECT public.anonymize_customer_by_phone(
  company_id := :company_id,
  customer_phone := :phone_number
);

-- What happens:
-- 1. profiles.email → 'user@...com' (masked)
-- 2. profiles.full_name → 'Usuário Deletado'
-- 3. profiles.cpf → NULL
-- 4. profiles.phone → NULL
-- 5. Wait: Audit log add 'deletion' DSAR record
-- 6. orders.client_name → 'Cliente Anonimizado'
-- 7. NOT delete (fiscal obligation for 5 years)
```

### 4.3 Direito à Correção

#### UI
```typescript
// Settings → Profile
const updateProfile = async (updates: Partial<Profile>) => {
  const { data } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
    
  // Audit log
  await logAuditEvent('profile.updated', {
    user_id: user.id,
    fields_changed: Object.keys(updates)
  });
};
```

---

## 5. SEGURANÇA (LGPD Art. 32)

### 5.1 Criptografia Obrigatória

```
┌─────────────────────┬──────────────┬──────────────┐
│ Dados               │ Em Repouso   │ Em Trânsito   │
├─────────────────────┼──────────────┼──────────────┤
│ Email, Nome         │ ✅ DB        │ ✅ HTTPS     │
│ CPF (pedigree)      │ ✅ DB        │ ✅ TLS 1.2   │
│ Endereço            │ ✅ DB        │ ✅ HTTPS+RLS │
│ Token JWT           │ ✅ SecureStore│ ✅ HTTPS     │
│ Senha               │ ✅ Bcrypt    │ ✅ HTTPS     │
│ Pagamento (PCI)     │ ❌ Processor │ ✅ Tokenized │
└─────────────────────┴──────────────┴──────────────┘
```

### 5.2 Audit Trail Imutável

**Tabela:** `billing_audit_log` + `consent_audit`

```typescript
// Every change must be logged
async function auditLogEvent(
  eventType: string,
  details: Record<string, unknown>
) {
  const parsed = JSON.stringify(details)
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, 'XXX.XXX.XXX-XX')  // CPF mask
    .replace(/\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/g, 'CARD_MASKED')  // CC
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, 'user@...com');  // Email mask
  
  return supabase.from('billing_audit_log').insert({
    event_type: eventType,
    details: parsed,
    user_id: userId,
    company_id: companyId,
    timestamp: new Date()
  });
}
```

**Retenção:** 3 anos (para compliance + investigação)

---

## 6. NOTIFICAÇÃO DE BREACH (LGPD Art. 34)

### 6.1 Plano de Resposta

Se houver vazamento de dados pessoais:

```
T+0h:   Descoberta do breach
T+6h:   - Confirmar incidente
        - Avaliar dados afetados
        - Notificar CTO + Legal
        
T+24h:  - Enviar notificação formál à ANPD
        - Comunicar aos usuários afetados
        - Publicar statement público
        
T+72h:  - Relatório completo à ANPD
        - RCA + plano de mitigação
        
T+30d:  - Comunicado final
```

### 6.2 Checklist de Comunicação
```
[ ] Email aos afetados com:
    - O que aconteceu
    - Quais dados foram expostos
    - O que fazer (mudar senha, etc)
    - Contato DPO para dúvidas
    
[ ] Buscybox no site + social media
[ ] Comunicado imprensa (se grave)
[ ] ANPD notification form
[ ] Autoridades (polícia se crime)
```

---

## 7. RESPONSIBILITY MATRIX

### 7.1 Roles

| Papel | Responsabilidades |
|-------|-------------------|
| **Controller** (Empresa) | Define base legal, política de privacidade, retém dados |
| **Processor** (Supabase) | Processa sob instrução, garante segurança |
| **DPO** (Data Protection Officer) | Monitora compliance, processa DSARs |
| **Engenheiro** | Implementa RLS, audit logging, criptografia |
| **Produto** | Define quais dados coletar (necessário?) |
| **Legal** | Política de privacidade, termos, compliance |

### 7.2 Verificação de Necessidade

Antes de adicionar um campo novo:

```
┌─────────────────────────────────────┐
│ 1. É necessário para negócio?       │
│    ✅ Sim → continua                │
│    ❌ Não → não colete!             │
├─────────────────────────────────────┤
│ 2. Qual é a base legal?             │
│    ✅ Contrato / Consentimento      │
│    ❌ Nenhuma → revise Produto!     │
├─────────────────────────────────────┤
│ 3. Qual é a retenção?               │
│    ✅ Máx 5 anos (fiscal limits)    │
│    ❌ Indefinido → defina limite!   │
├─────────────────────────────────────┤
│ 4. Como será deletado?              │
│    ✅ Anonymize + audit log         │
│    ❌ Sem plano → não coleta!       │
└─────────────────────────────────────┘
```

---

## 8. POLÍTICA DE RETENÇÃO (LGPD Art. 16)

### 8.1 Prazos Legais

```sql
-- Profile data (sem atividade)
UPDATE profiles 
SET anonymized_at = NOW()
WHERE (SELECT MAX(created_at) FROM orders WHERE user_id = profiles.id) 
  < NOW() - INTERVAL '12 months'
  AND anonymized_at IS NULL;

-- Transaction data
-- Fiscal law: Manter 5 anos (RFB)
-- depois: agregue ou anonimize

-- Logs de acesso
-- Retenção: 3 anos (compliance)
-- Depois: arquivar ou deletar

-- Consentimento
-- Retenção: enquanto relação ativa + 2 anos
```

### 8.2 Automation

```typescript
// Cron job: Monthly retention check
// Cloud Scheduler → Edge Function
Deno.serve(async (req) => {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, last_order_date')
    .lt('last_order_date', new Date(Date.now() - 365*24*60*60*1000))
    .is('anonymized_at', null);
  
  for (const profile of profiles) {
    await anonymizeProfile(profile.id);
    console.log(`[LGPD] Anonymized profile ${profile.id}`);
  }
});
```

---

## 9. DPIA (Data Protection Impact Assessment)

### 9.1 Quando é Necessária (Art. 5.X)

Uma DPIA é OBRIGATÓRIA quando:

```
✅ Processamento de dados sensíveis (CPF, saúde, etc)
✅ Processamento em larga escala (N > 10k usuarios)
✅ Profiling / decisões automatizadas
✅ Vigilância sistemática
✅ Novas tecnologias (IA, ML, biometria)
```

### 9.2 Checklist DPIA

```
[ ] Identificar riscos à privacidade
[ ] Mapear dados pessoais
[ ] Avaliar impacto para titulares
[ ] Definir medidas de mitigação
[ ] Envolver DPO + Legal + Tech
[ ] Documentar decisões
[ ] Revisão anual
```

### 9.3 Template (Simplificado)

```markdown
# DPIA - restaurante-supabase Billing Module

## 1. Risco: Vazamento de CPF
**Probabilidade:** Médio (RLS + audit trail implementados)
**Impacto:** Alto (identidade roubada)
**Severidade:** ALTO
**Mitigação:**
- RLS policies isolam por company_id
- CPF mascarado em logs (XXX.XXX.XXX-XX)
- Audit trail imutável (3 anos)
- MFA obrigatório para admins

## 2. Risco: Retenção inde finida de dados
**Probabilidade:** Médio
**Impacto:** Médio
**Severidade:** MÉDIO
**Mitigação:**
- Automatizar anonimização após 12 meses inatividade
- Deletar após DSAR
- Política clara de retenção (5 anos fiscal)
```

---

## 10. CHECKLIST LGPD FOR DEVELOPERS

### Antes de Commitar Código

```
[ ] Nenhum CPF hardcoded em testes/logs
[ ] Nenhum email completo em audit logs
[ ] Nenhum cartão de crédito (mesmo last 4 dígitos)
[ ] Nenhuma senha ou token em logs
[ ] Senhas: Bcrypt mínimo 10 rounds
[ ] Emails: Mascarados em logs e audit trail
[ ] RLS policies: Validam company_id ✅
[ ] Audit log: Registra TODAS operações sensíveis
[ ] Consentimento: Explícito (nunca pré-checado)
[ ] Retenção: Claramente documentada
[ ] Error messages: Genéricas (não expõem internals)
[ ] HTTPS: Obrigatório para dados sensíveis
[ ] Tests: Coverage para RLS + access control
```

### Antes de Deploy

```
[ ] Code review com DPO/Security
[ ] DPIA atualizada (se novo processamento)
[ ] Privacy policy alinhada
[ ] Política de retenção implementada
[ ] Audit logs testados
[ ] DSAR flow funcionando
[ ] Consentimento request implementado
[ ] Gitleaks clean (zero secrets)
[ ] Snyk/Trivy clean (zero critical CVE)
```

---

## 11. TEMPLATE: PRIVACY POLICY (RESUMIDO)

```markdown
# Política de Privacidade - restaurante-supabase

## 1. Coleta de Dados
Coletamos: Email, Nome, CPF, Telefone, Endereço
Com base legal: Contrato (Art. 7.I) + Consentimento (Art. 7.VIII)
Em quais contextos: Cadastro, checkout, delivery, pagamento

## 2. Compartilhamento
- Mercado Pago: Cartão + CPF (processador de pagamento)
- Entregadores: Endereço + Telefone (para entrega)
- Nunca: Compartilhamos dados com terceiros sem consentimento

## 3. Retenção
- Dados de conta: Até você deletar
- Dados de pagamento: 5 anos (obrigação fiscal)
- Logs: 3 anos (segurança)

## 4. Seus Direitos
- Acessar: privacy@restaurante.com
- Deletar: Settings → Privacy → Delete Account
- Corrigir: Settings → Edit Profile
- Parar emails: Link no footer (unsubscribe)

## 5. Segurança
Usando: Criptografia TLS + Secure storage no celular

## 6. Contato
DPO: dpo@restaurante.com
```

---

## 📞 CONTATOS IMPORTANTES

| Órgão | Contato | Quando |
|-------|---------|--------|
| **ANPD** | https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd | Breach notification |
| **OAB - Comissão de Tech** | - | Consultoria legal |
| **Supabase Security** | security@supabase.com | Breach em infraestrutura |

---

## PRÓXIMAS AÇÕES

- [ ] Designar DPO oficialmente
- [ ] Publicar Privacy Policy final  
- [ ] Implementar DSAR flow
- [ ] Automatizar retenção
- [ ] Treinar time em LGPD
- [ ] Fazer DPIA completa
- [ ] Documentar consentimento

**Última revisão:** 23 de março de 2026  
**Próxima revisão:** 23 de junho de 2026 (trimestral)
