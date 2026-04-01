# LGPD Privacy Notice & Data Collection Disclosures

**Version**: 1.1  
**Effective Date**: 2026-03-23  
**Last Updated**: 2026-04-01  
**Next Review**: 2026-07-01  
**Owner**: Legal + Product + Engineering  

## Overview

Template privacy notice (Aviso de Privacidade) for placement in app, website, and checkout flows per LGPD Art. 14.

**Language**: Portuguese (PT-BR) + English (EN-US)  
**Audience**: Customers, delivery partners, users

---

## In-App Privacy Notice (Short Form)

**Location**: First login, Settings > Privacy, Checkout confirmation screen

### Portuguese (PT-BR)

```
🔐 AVISO DE PRIVACIDADE

Nós coletamos seus dados para:
✓ Processar seus pedidos
✓ Processar pagamentos
✓ Entregar seu pedido
✓ Melhorar nossos serviços

Seus dados são protegidos por criptografia e não serão 
compartilhados sem seu consentimento.

Você tem direito de:
📋 Acessar seus dados (solicite em privacy@[domínio])
✂️ Deletar seus dados
📧 Parar de receber emails marketing
👁️ Saber como usamos seus dados

[Ver Política Completa] [Solicitar Dados] [Parar Emails]
```

### English (EN-US)

```
🔐 PRIVACY NOTICE

We collect your data to:
✓ Process your orders
✓ Process payments
✓ Deliver your order
✓ Improve our services

Your data is protected by encryption and will not be 
shared without your consent.

You have the right to:
📋 Access your data (request at privacy@[domain])
✂️ Delete your data
📧 Stop receiving marketing emails
👁️ Know how we use your data

[Full Privacy Policy] [Request Data] [Stop Emails]
```

---

## Full Privacy Policy (Legal Document)

### Portuguese

```
POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS

Versão: 1.0
Data de Vigência: [Data]
Responsável: [Empresa], CNPJ [XX.XXX.XXX/0001-XX]
Encarregado de Dados (DPO): [Nome] | dpo@[domínio] | +55 11 3000-0000

─────────────────────────────────────────────────────────────

1. INFORMAÇÕES SOBRE O CONTROLADOR DE DADOS

Nome: Restaurant Tech Ltda.
Endereço: [Endereço comercial]
Email: privacy@[domínio]
Telefone: +55 11 3000-0000 (Atendimento LGPD)
CNPJ: XX.XXX.XXX/0001-XX

2. DADOS PESSOAIS COLETADOS

Coletamos os seguintes dados quando você:

A) CRIA CONTA (Clientes):
   - Nome completo
   - Email
   - CPF (CPF Físico)
   - Telefone
   - Endereço de entrega
   - Preferências alimentares (alergias, restrições)
   - Histórico de pedidos
   - Método de pagamento (token, não armazenamos cartão completo)

B) FAZ PEDIDO:
   - Produtos selecionados
   - Endereço de entrega
   - Instruções especiais
   - Horário do pedido
   - Histórico de transações

C) ENTREGA:
   - Localização GPS (durante entrega)
   - Hora de coleta e entrega
   - Assinatura (foto ou digital)
   - Feedback/avaliação

D) ACESSA NOSSOS SERVIÇOS:
   - Endereço IP
   - Tipo de dispositivo (smartphone, desktop)
   - Navegador
   - Cookies de sessão
   - Logs de acesso

E) MARKETING (Com Consentimento):
   - Email para newsletter
   - Telefone para SMS promocional
   - Preferências de comunicação

3. BASES LEGAIS PARA COLETA (LGPD Art. 7)

| Dado | Base Legal | Retenção |
|------|-----------|----------|
| Nome, Email, CPF | Contrato (fornecer serviço) | Duração do contrato + 6 meses |
| Endereço de entrega | Contrato (entregar pedido) | Duração + 2 anos |
| Histórico de pedidos | Interesse legítimo (fraude) | 3 anos |
| Pagamentos | Lei (fiscal/CFP) | 5 anos |
| Cookies | Consentimento | Duração da sessão + opção de revogar |
| Marketing | Consentimento | Até revogar |

4. COMPARTILHAMENTO DE DADOS

Seus dados são compartilhados com:

✓ **Parceiros de Entrega**: seu endereço e itens do pedido 
  (para entregar seu pedido)

✓ **Processador de Pagamentos** (Mercado Pago): 
  token do cartão, valor da transação (para processar pagamento)

✓ **Autoridades**: Se obrigado por lei (Polícia Federal, 
  Receita Federal, autoridade judicial)

✗ NÃO compartilhamos:
  - Número completo do cartão (PCI-DSS, armazenado por Mercado Pago apenas)
  - Senha
  - Dados com empresas de marketing/venda de contatos
  - Dados com terceiros sem sua permissão

5. DIREITOS DO TITULAR DE DADOS (LGPD Art. 18-19)

Você tem direito de:

📋 **ACESSAR** seus dados pessoais
   Solicite em: privacy@[domínio] | Prazo: 15 dias úteis

✂️ **DELETAR** seus dados (direito ao esquecimento)
   Exceto dados necessários por lei (fiscal, pagamentos)
   Prazo: 15 dias úteis

📤 **PORTABILIDADE**: Dados em formato estruturado (JSON/CSV)
   Para transferir para outro serviço | Prazo: 15 dias úteis

✏️ **CORRIGIR** dados imprecisos ou incompletos
   Prazo: 15 dias úteis

🚫 **REVOGAR CONSENTIMENTO**
   Parar marketing, cookies, profiling
   Prazo: 24 horas (marketing), 7 dias (processamento)

⚖️ **SE DISCORDAR** de uma decisão automatizada
   Solicitar revisão humana

Para exercer direitos, envie solicitação com:
- Seu CPF ou dados de identificação
- Descrição do direito que deseja exercer
- Cópia de documento (RG, CNH, CPF)

Email: privacy@[domínio]
Telefone: +55 11 3000-0000

6. SEGURANÇA DE DADOS

Implementamos medidas de segurança incluindo:

✓ Criptografia de dados transmitidos (HTTPS TLS 1.3)
✓ Rate limiting (proteção contra força bruta)
✓ Firewall (bloqueio de IPs suspeitos)
✓ Autenticação segura (JWT + cookies HttpOnly)
✓ Auditoria de acesso (logs imutáveis por 3 anos)
✓ Isolamento de sistemas (separação dados clientes vs. parceiros)
✓ Testes de segurança (DAST, SAST mensais)
✓ Resposta a incidentes (plano formalizado)

IMPORTANTE: Nenhum método é 100% seguro. Se suspeitar de 
vazamento, notifique: security@[domínio] imediatamente.

7. RETENÇÃO DE DADOS

Dados são retidos pelo tempo necessário, não mais:

- Clientes ativos: Conta ativa + 6 meses
- Pedidos: 2 anos (para resolver disputas)
- Pagamentos: 5 anos (lei fiscal CFP)
- Logs: 7 dias (automático)
- Backup: Até 30 dias, depois deletado

Você pode pedir para deletar dados a qualquer hora
(exceto dados obrigatórios por lei).

8. COOKIES E RASTREAMENTO

Utilizamos cookies para:

Essencial (obrigatório):
☐ Manter você conectado
☐ Lembrar preferências de idioma/tema
☐ Proteger contra CSRF

Marketing (requer consentimento):
☐ Analytics (Google Analytics - desativado por padrão)
☐ Publicidade (Facebook Pixel - desativado por padrão)

Você pode:
✓ Aceitar todos
✓ Rejeitar todos
✓ Personalizar (Settings > Privacidade)

Alterar preferência: Settings > Cookies > Gerenciar Consentimento

9. TRANSFERÊNCIA INTERNACIONAL

Seus dados NÃO são transferidos fora do Brasil, exceto:
- Mercado Pago (processador de pagamentos sediado no Brasil)
- Supabase (banco de dados - Brasil/data residency)
- Google Analytics (opcional, usuário escolhe)

Transferências internacionais apenas com:
✓ Sua autorização explícita
✓ Contrato de proteção de dados
✓ Padrões equivalentes a LGPD

10. CONTATO E DÚVIDAS

Encarregado de Dados (DPO):
📧 dpo@[domínio]
📞 +55 11 3000-0000 (2ª-6ª, 9h-18h)

Reclamação à ANPD:
Se considerar que fornecemos uma resposta insatisfatória, 
faça uma reclamação à Autoridade Nacional de Proteção de Dados:
🌐 https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
```

### English (EN-US)

```
PRIVACY POLICY & DATA PROTECTION

Version: 1.0
Effective Date: [Date]
Data Controller: [Company], CNPJ [XX.XXX.XXX/0001-XX]
Data Protection Officer: [Name] | dpo@[domain] | +55 11 3000-0000

─────────────────────────────────────────────────────────────

1. THE CONTROLLER OF YOUR DATA

Company Name: Restaurant Tech Ltda.
Address: [Commercial Address]
Email: privacy@[domain]
Phone: +55 11 3000-0000 (LGPD Support)
Tax ID: XX.XXX.XXX/0001-XX

2. PERSONAL DATA WE COLLECT

We collect the following when you:

A) CREATE AN ACCOUNT:
   - Full name
   - Email address
   - CPF (Brazilian tax ID)
   - Phone number
   - Delivery address
   - Dietary preferences (allergies, restrictions)
   - Order history
   - Payment method (token only, not full card)

B) PLACE AN ORDER:
   - Products selected
   - Delivery address
   - Special instructions
   - Order timestamp
   - Transaction history

C) USE DELIVERY SERVICE:
   - GPS location (during delivery)
   - Pickup & delivery times
   - Digital signature
   - Feedback/rating

D) ACCESS OUR SERVICES:
   - IP address
   - Device type (smartphone, desktop)
   - Browser type
   - Session cookies
   - Access logs

E) MARKETING (With Consent):
   - Email for newsletter
   - Phone for SMS promotions
   - Communication preferences

3. LEGAL BASIS FOR DATA COLLECTION (LGPD Art. 7)

| Data | Legal Basis | Retention |
|------|-----------|-----------|
| Name, Email, CPF | Contract (service) | Contract + 6 months |
| Delivery Address | Contract (delivery) | Duration + 2 years |
| Order History | Legitimate Interest | 3 years |
| Payments | Law (tax/fiscal) | 5 years |
| Cookies | Consent | Session + revoke option |
| Marketing | Consent | Until revoked |

4. DATA SHARING

Your data is shared with:

✓ **Delivery Partners**: Your address & order items
   (to deliver your order)

✓ **Payment Processor** (Mercado Pago):
   Card token, transaction amount (to process payment)

✓ **Authorities**: If legally required (Federal Police,
   Tax Authority, court order)

✗ We DO NOT share:
  - Full card number (PCI-DSS, Mercado Pago only)
  - Password
  - Data with marketing/data brokers
  - Data with third parties without permission

5. YOUR DATA RIGHTS (LGPD Art. 18-19)

You have the right to:

📋 **ACCESS** your personal data
   Request at: privacy@[domain] | Response time: 15 days

✂️ **DELETE** your data (right to be forgotten)
   Except data required by law (taxes, payments)
   Response time: 15 days

📤 **PORTABILITY**: Data in structured format (JSON/CSV)
   To transfer to another service | Response time: 15 days

✏️ **CORRECT** inaccurate or incomplete data
   Response time: 15 days

🚫 **REVOKE CONSENT**
   Stop marketing, cookies, profiling
   Response time: 24 hours (marketing), 7 days (processing)

⚖️ **OBJECT** to automated decisions
   Request human review

To exercise rights, send a request with:
- Your CPF or identifying information
- Description of the right you want to exercise
- Copy of ID (passport, driver license, CPF document)

Email: privacy@[domain]
Phone: +55 11 3000-0000

6. DATA SECURITY

We implement security measures including:

✓ Encryption of transmitted data (HTTPS TLS 1.3)
✓ Rate limiting (protection against brute force)
✓ Firewall (suspicious IP blocking)
✓ Secure authentication (JWT + HttpOnly cookies)
✓ Access audit logs (immutable, 3 years retention)
✓ System isolation (customer vs. partner data separation)
✓ Security testing (DAST, SAST monthly)
✓ Incident response (formal plan in place)

IMPORTANT: No method is 100% secure. If you suspect a breach,
notify immediately: security@[domain]

7. DATA RETENTION

Data is retained only as long as necessary:

- Active customers: Account active + 6 months
- Orders: 2 years (dispute resolution)
- Payments: 5 years (tax law requirement)
- Logs: 7 days (automatic purge)
- Backups: Up to 30 days, then destroyed

You can request deletion at any time
(except data required by law).

8. COOKIES & TRACKING

We use cookies for:

Essential (required):
☐ Keep you logged in
☐ Remember language/theme preferences
☐ CSRF protection

Marketing (requires consent):
☐ Analytics (Google Analytics - off by default)
☐ Advertising (Facebook Pixel - off by default)

You can:
✓ Accept all
✓ Reject all
✓ Customize (Settings > Privacy)

Change preferences: Settings > Cookies > Manage Consent

9. INTERNATIONAL DATA TRANSFERS

Your data is NOT transferred outside Brazil, except:
- Mercado Pago (payment processor - Brazil-based)
- Supabase (database - Brazil data residency)
- Google Analytics (optional, user choice)

International transfers only with:
✓ Your explicit authorization
✓ Data protection agreement
✓ Equivalent protections to LGPD

10. CONTACT & QUESTIONS

Data Protection Officer:
📧 dpo@[domain]
📞 +55 11 3000-0000 (Mon-Fri, 9am-6pm BRT)

File Complaint with ANPD:
If you believe we did not respond satisfactorily to your request,
file a complaint with Brazil's National Data Protection Authority:
🌐 https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
```

---

## Marketing Consent Form (Opt-In)

**Location**: Checkout, Settings, Email signup

### Portuguese

```
☐ Desejo receber emails sobre promoções, novos produtos e ofertas.
  (Você pode desmarcar a qualquer momento em Settings)

☐ Desejo receber SMS com cupons e ofertas exclusivas.
  (Taxas de mensagem podem se aplicar. Desmarque para parar)

☐ Entendo que meus dados serão usados para personalizar 
  recomendações e melhorar minha experiência.

[Consentir] [Rejeitar]
```

### English

```
☐ I want to receive promotional emails, new products and offers.
  (You can unsubscribe at any time in Settings)

☐ I want to receive SMS coupons and exclusive offers.
  (Message rates may apply. Uncheck to stop)

☐ I understand my data will be used to personalize 
  recommendations and improve my experience.

[Consent] [Reject]
```

---

## Required Disclosures at Checkout

**Must display before payment is processed**:

### Portuguese

```
🔒 Seus dados de pagamento são processados de forma segura por Mercado Pago.
   Seu cartão não é armazenado em nossos servidores.

📋 Ao comprar, você concorda com nossa Política de Privacidade.

💳 Todas as transações usam criptografia SSL/TLS.

❓ Dúvidas? privacy@[domínio]
```

### English

```
🔒 Your payment data is securely processed by Mercado Pago.
   Your card is not stored on our servers.

📋 By purchasing, you agree to our Privacy Policy.

💳 All transactions use SSL/TLS encryption.

❓ Questions? privacy@[domain]
```

---

## Annual Privacy Impact Assessment

**To be completed**: Every 12 months or after major system changes

```
□ Audit all data collection points (forms, API, logs)
□ Verify retention periods match policy
□ Test data deletion procedures
□ Review sharing arrangements with third parties
□ Assess security controls (penetration test, code review)
□ Document any breaches or incidents
□ Evaluate new data processing (new features?)
□ Update policy if changes found
□ Notify customers of material changes (email + in-app)
```

---

**This Privacy Policy is a living document. Last updated: 2026-03-23. Next review: 2027-03-23.**
