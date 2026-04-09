# Cadastro iFood e Credenciais de API

## 1. Objetivo

Documentar o processo completo de onboarding no iFood para habilitar a integracao tecnica com o ecossistema:

- restaurante-web
- restaurante-ops
- Supabase

Este guia cobre o caminho de cadastro, habilitacao de integracao, obtencao de credenciais e validacao inicial.

## 2. Escopo

Este documento inclui:

1. Cadastro da empresa no iFood.
2. Habilitacao de conta para integracoes.
3. Obtencao de credenciais de API.
4. Configuracao inicial de webhook.
5. Checklist de seguranca e homologacao.

Este documento nao inclui implementacao de codigo.

## 3. Responsabilidades

- Produto/Operacao: cadastro comercial e validacoes de negocio.
- Engenharia: configuracao tecnica, seguranca e homologacao.
- Seguranca/Compliance: validacao de segredos, LGPD e trilha de auditoria.

## 4. Pre-requisitos

1. CNPJ ativo e dados fiscais validos.
2. Documentacao societaria e bancaria da empresa disponivel.
3. Responsavel tecnico e responsavel operacional definidos.
4. Endpoint HTTPS publico para receber webhooks.
5. Ambiente server-side para armazenar segredos.

## 5. Processo de cadastro e habilitacao

## 5.1 Cadastro inicial no portal iFood

1. Criar a conta da empresa no portal oficial do iFood.
2. Preencher dados legais, contatos e dados da operacao.
3. Confirmar e-mail e contato do responsavel.

## 5.2 Validacao documental e aprovacao

1. Enviar documentos exigidos pelo iFood.
2. Aguardar aprovacao comercial e operacional.
3. Confirmar que a conta esta apta para integracoes.

## 5.3 Habilitacao de integracao/API

1. Acessar a area de desenvolvedor/integracoes no portal iFood.
2. Solicitar habilitacao de API para a conta.
3. Definir escopos autorizados para a aplicacao.

Observacao:
- Nome e fluxo podem variar conforme o produto/plano contratado no iFood.

## 6. Obtencao de credenciais

As nomenclaturas podem variar, mas normalmente incluem:

- identificador da aplicacao (client/app id)
- segredo da aplicacao (client secret)
- identificador da loja/merchant
- credencial de assinatura de webhook

## 6.1 Politica obrigatoria de segredos

1. Nao armazenar segredo em codigo-fonte.
2. Nao expor segredo em variavel publica de cliente.
3. Nao registrar credencial em logs.
4. Rotacionar credenciais periodicamente.

## 6.2 Variaveis de ambiente sugeridas

No backend (restaurante-ops), usar variaveis server-side:

- IFOOD_CLIENT_ID
- IFOOD_CLIENT_SECRET
- IFOOD_MERCHANT_ID
- IFOOD_WEBHOOK_SECRET
- IFOOD_ENVIRONMENT

## 7. Configuracao inicial de webhook

1. Definir URL HTTPS publica no restaurante-ops.
2. Configurar a URL no portal do iFood.
3. Configurar chave de assinatura para validacao HMAC.
4. Validar recebimento de eventos de teste.

Regras minimas:

- validar assinatura antes de processar payload
- validar idempotencia por event_id
- validar tenant por mapeamento merchant_id -> company_id
- responder com codigo HTTP apropriado para retries

## 8. Homologacao tecnica

## 8.1 Checklist de homologacao

- [ ] Conta aprovada e com API habilitada.
- [ ] Credenciais geradas e armazenadas com seguranca.
- [ ] Webhook configurado e recebendo eventos de teste.
- [ ] Assinatura HMAC validada com sucesso.
- [ ] Evento duplicado sem efeito colateral.
- [ ] Logs sem PII em texto claro.
- [ ] Mapeamento merchant_id -> company_id validado.

## 8.2 Cenarios minimos de teste

1. Evento valido com assinatura valida.
2. Evento com assinatura invalida.
3. Evento duplicado.
4. Evento com merchant sem mapeamento interno.
5. Evento com payload incompleto/invalido.

## 9. Passagem para producao

1. Revisao de seguranca final.
2. Revisao de operacao/runbook.
3. Rollout canario para grupo restrito.
4. Monitoramento reforcado nas primeiras 48h.

## 10. Riscos comuns e mitigacoes

1. Risco: credencial exposta.
Mitigacao: segredo somente server-side + rotacao.

2. Risco: pedido de outra empresa processado no tenant errado.
Mitigacao: resolver company_id por mapeamento de merchant confiavel.

3. Risco: duplicidade de pedido/evento.
Mitigacao: idempotencia por chave unica + restricao no banco.

4. Risco: falta de rastreabilidade em incidente.
Mitigacao: request_id/event_id em toda trilha de log e auditoria.

## 11. Referencias internas

- ./README.md
- ./CONTRATOS-API.md
- ./SEGURANCA-LGPD.md
- ./OPERACAO-RUNBOOK.md
- ../LGPD/LGPD-COMPLIANCE-GUIDE.md
- ../security/SECURITY_AUDIT_REPORT_2026-03-23.md
