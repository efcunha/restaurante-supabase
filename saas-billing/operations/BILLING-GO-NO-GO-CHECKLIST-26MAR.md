# Checklist Operacional GO/NO-GO — Billing Mercado Pago (26 mar)

**Objetivo:** Fechar a decisão de promoção do billing para produção com evidência mínima, sem depender de interpretação solta dos documentos da auditoria.

**Janela recomendada:** 07h00-10h00  
**Responsável pela decisão:** Tech Lead / responsável de plantão  
**Critério de segurança:** qualquer erro 5xx inesperado, vazamento de dado sensível, reconciliação inconsistente ou ausência de evidência encerra a janela como NO-GO.

---

## 1. Gates prévios obrigatórios

- [ ] P1 confirmado: secrets TEST- carregados e webhook rejeita requisição sem assinatura
- [ ] P2 confirmado: `reconcile_billing_event_atomic` sem `mp_payment_id` em `billing_audit_log`
- [ ] E1 confirmado: baseline de invoices coerente
- [ ] E2 confirmado: backlog de `webhook_events` zerado
- [ ] E3 confirmado: sem campos sensíveis em `billing_audit_log`

Se qualquer item acima estiver sem evidência atual, parar e registrar NO-GO.

---

## 2. Execução funcional obrigatória

### S1. Tela de assinatura
- [ ] Login com conta cliente TEST
- [ ] Tela de assinatura abriu sem `401/403`
- [ ] Console/rede sem erro de auth para billing

### S2. PIX
- [ ] Fluxo gerou QR code PIX
- [ ] Invoice criada no banco
- [ ] `status='pending'`
- [ ] `payment_method_type='pix'`

### S3. Cartão TEST
- [ ] Cartão TEST salvo com sucesso
- [ ] `payment_methods.last_four` preenchido corretamente
- [ ] `brand` preenchido
- [ ] Nenhum PAN/CVV/token completo apareceu em `billing_audit_log`

### S4. Webhook e idempotência
- [ ] Sem assinatura retorna `401`
- [ ] Assinatura adulterada retorna `401`
- [ ] Replay retorna `401`
- [ ] Assinatura válida é aceita pela camada de segurança
- [ ] Evento final exercitou reconcile ou ficou explicitamente documentado por que não ocorreu
- [ ] Não houve duplicação por `idempotency_key`

### S5. License gate
- [ ] Usuário sem assinatura ativa foi bloqueado corretamente
- [ ] Fluxo não liberou acesso indevido
- [ ] Evidência salva

Se qualquer item de S1-S5 falhar, a decisão é NO-GO.

---

## 3. Evidências mínimas que precisam existir

- [ ] Horário de início e término de cada teste
- [ ] HTTP status ou resposta observada
- [ ] Screenshot ou print de tela quando aplicável
- [ ] Query SQL usada para validar invoice / payment_method / webhook / audit log
- [ ] Identificadores relevantes: `invoice_id`, `payment_method_id`, `idempotency_key`, `company_id`
- [ ] Nome de quem executou e nome de quem aprovou

Sem essas evidências, tratar como NO-GO documental.

---

## 4. Regras de decisão

### GO

Marcar GO somente se todos os pontos abaixo forem verdadeiros:

- [ ] P1-P2 = PASS
- [ ] E1-E3 = PASS
- [ ] S1-S5 = PASS
- [ ] Nenhum `5xx` inesperado durante a janela
- [ ] Nenhum vazamento sensível em log/audit
- [ ] Idempotência preservada
- [ ] Aprovação explícita registrada por responsável

### NO-GO

Marcar NO-GO se ocorrer qualquer um dos itens abaixo:

- [ ] Falha em qualquer smoke S1-S5
- [ ] Divergência entre UI e estado persistido no banco
- [ ] Webhook aceito sem assinatura válida
- [ ] Duplicação em `webhook_events` ou reconcile inconsistente
- [ ] Qualquer vazamento de dado sensível em log/audit/details
- [ ] Falta de evidência para um teste executado

---

## 5. Registro final da janela

**Decisão final:** [ ] GO  [ ] NO-GO  
**Data/Hora:** ____________________  
**Responsável pela execução:** ____________________  
**Responsável pela aprovação:** ____________________

**Resumo curto da decisão:**

```
<preencher com 3-5 linhas objetivas>
```

**Ações seguintes se GO:**
- [ ] Agendar promoção para APP_USR
- [ ] Comunicar stakeholders
- [ ] Registrar evidências no repositório/issue

**Ações seguintes se NO-GO:**
- [ ] Abrir issue de remediação com severidade
- [ ] Anexar evidências
- [ ] Definir nova janela de reteste