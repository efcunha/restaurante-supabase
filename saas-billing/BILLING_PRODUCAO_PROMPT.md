# Prompt Reutilizavel — Ativacao de Billing em Producao (Mercado Pago)

Use este prompt quando quiser retomar exatamente este topico e executar a ativacao de producao com seguranca.
---
Quero ativar o billing em PRODUCAO no projeto restaurante-supabase com Mercado Pago (API de producao).

Contexto obrigatorio:
- Projeto Supabase: ykalocfhnetxenvmtlcn
- Stack: restaurante-app + restaurante-web (paridade obrigatoria)
- Billing ja validado localmente (cartao e Pix)
- Multi-tenant safety: respeitar company_id e RLS
- Nao pode haver segredo em codigo fonte ou .env commitado
- Ativacao em canary waves (nao full de uma vez)

Objetivo:
- Executar um runbook completo de producao para billing
- Configurar secrets de producao do Mercado Pago
- Garantir Edge Functions corretas
- Validar fluxo de cobranca e desbloqueio operacional
- Entregar checklist final de go-live + rollback

Quero que voce execute nesta ordem:

1) Pre-check de seguranca e estado atual
- Verificar flags de billing atuais (app e web)
- Confirmar se ha diferencas app/web que quebram paridade
- Confirmar que LicenseGate esta ativo nas telas operacionais e Admin continua acessivel para renovacao
- Confirmar que nao existe EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK ativo em producao

2) Secrets de producao do Mercado Pago (Supabase)
- Configurar apenas via supabase secrets (nunca no git)
- Esperado:
  - MERCADOPAGO_PUBLIC_KEY=APP_USR_...
  - MERCADOPAGO_ACCESS_TOKEN=APP_USR_...
  - MERCADOPAGO_WEBHOOK_SECRET=...
  - MERCADOPAGO_NOTIFICATION_URL=...
- Validar com billing-provider-status e mostrar resultado

3) Deploy/redeploy das Edge Functions de billing
- billing-create-checkout
- billing-create-pix-fallback
- billing-provider-status
- (se aplicavel) webhook de billing
- Confirmar health de cada endpoint e autenticacao

4) Ativacao de flags em producao por ondas
- Wave 1:
  - EXPO_PUBLIC_FEATURE_BILLING=true
  - EXPO_PUBLIC_FEATURE_BILLING_SCREEN=true
  - EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=false
- Wave 2:
  - aumentar base monitorada
- Wave 3:
  - EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=true
- Para cada wave, definir criterios objetivos de avanco/rollback

5) Smoke test em producao (conta real controlada)
- Login admin
- Abrir Assinatura SaaS
- Cadastrar cartao
- Solicitar Pix
- Confirmar webhook/reconciliacao
- Confirmar atualizacao do status da assinatura
- Confirmar desbloqueio operacional apos pagamento aprovado/reconciliado

6) Validacao tecnica final (DB e logs)
- Verificar subscriptions, invoices, payment_methods, webhook_events, billing_audit_log
- Confirmar transicoes de status corretas:
  - trialing -> active
  - past_due/grace_period/suspended -> reactivated/active
- Confirmar que assinatura cancelled nao reativa automaticamente

7) Plano de rollback pronto para execucao imediata
- Desativar flags de billing (ordem segura)
- Reverter deploy de funcao se necessario
- Procedimento de comunicacao e mitigacao

Formato de resposta que eu quero:
- Responder em PT-BR
- Trazer blocos com:
  - "Comandos para executar"
  - "Validacoes esperadas"
  - "Riscos e mitigacao"
  - "Criterio de go/no-go"
- No fim, me entregar um checklist operacional marcavel para execucao em janela de producao.

Importante:
- Se faltar qualquer credencial/permissao de acesso, parar no ponto exato e pedir apenas o minimo necessario para continuar.
- Nao pular validacoes.
---
## Variante Curta (para uso rapido)

Ative billing em PRODUCAO no restaurante-supabase com Mercado Pago, seguindo runbook seguro:
1. Pre-check (flags, paridade app/web, LicenseGate ativo, sem force block)
2. Secrets Supabase de producao (APP_USR_*)
3. Deploy Edge Functions billing
4. Canary waves (Wave1 sem license gate, Wave3 com license gate)
5. Smoke test completo (cartao, Pix, webhook, reconciliacao)
6. Validacao DB/logs
7. Checklist final + rollback pronto

Exijo: comandos executaveis, validacoes por etapa, criterio go/no-go, e parada explicita se faltar credencial.
