# Billing Functions Scripts

Scripts operacionais e de smoke test das Edge Functions de billing.

## Conteúdo

- `billing-smoke-test.ps1` / `billing-smoke-test.sh`: valida readiness básica das functions de billing
- `billing-webhook-test.ps1` / `billing-webhook-test.sh`: valida camada de assinatura HMAC do webhook
- `billing-webhook-simple.ps1`: teste rápido e manual de webhook sem assinatura
- `billing-card-test.ps1` / `billing-card-test.sh`: valida fluxo de cartão em ambiente controlado
- `billing-audit-check.ps1` / `billing-audit-check.sh`: confere eventos esperados no `billing_audit_log`
- `billing-verify-all.ps1` / `billing-verify-all.sh`: encadeia smoke + audit checks

## Regra de uso

- usar esses scripts apenas para validação operacional de billing
- manter segredos fora do código e carregar via variáveis de ambiente/sessão
- preferir os runbooks em `saas-billing/operations/` quando a execução fizer parte de janela controlada
