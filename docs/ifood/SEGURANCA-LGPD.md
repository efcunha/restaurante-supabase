# Seguranca e LGPD - Integracao iFood

## 1. Escopo de seguranca

A integracao iFood envolve:

- webhook inbound de fonte externa
- dados de cliente e endereco (PII)
- atualizacao de estado operacional e financeiro

Por isso, deve ser tratada como fluxo sensivel.

## 2. Controles obrigatorios

## 2.1 Assinatura e autenticidade

- validar assinatura HMAC de todos os webhooks
- usar comparacao segura (`timing-safe`)
- rejeitar payload sem header de assinatura

## 2.2 Multi-tenant

- resolver `company_id` por credencial/merchant configurado
- nunca confiar em `company_id` recebido livremente no payload
- aplicar RLS em todas as tabelas de integracao

## 2.3 Idempotencia

- deduplicar por `provider + event_id` ou chave equivalente
- processar evento em transacao atomica quando houver escrita multipla
- registrar `already_processed` para replay seguro

## 2.4 Segredos

- nunca hardcode de token/chave iFood
- secrets apenas em ambiente server-side
- manter `.env.example` com placeholders, sem valores reais

## 2.5 Logs e observabilidade

- nao logar PII em texto claro
- mascarar telefone e endereco quando necessario
- logar identificadores tecnicos (event_id, request_id, company_id)

## 3. LGPD

## 3.1 Dados pessoais envolvidos

- nome de cliente
- telefone
- endereco de entrega

## 3.2 Regras de tratamento

- minimizacao: armazenar apenas o necessario para operacao
- finalidade: processamento de pedido e entrega
- retencao: seguir politica oficial de LGPD do projeto
- exclusao: suportar remocao/anonimizacao quando aplicavel

## 3.3 Base documental

- [Guia LGPD](../LGPD/LGPD-COMPLIANCE-GUIDE.md)
- [Auditoria de seguranca](../security/SECURITY_AUDIT_REPORT_2026-03-23.md)

## 4. Checklist de hardening pre-go-live

- [ ] assinatura webhook validada e testada
- [ ] idempotencia validada com reenvio de evento
- [ ] segregacao por `company_id` validada
- [ ] RLS validada remotamente em `pg_policies`
- [ ] logs sem PII em texto claro
- [ ] rate limiting definido para endpoint inbound
- [ ] runbook de incidente pronto
