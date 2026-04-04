# Status Semanal de Remediacao - Q2 2026

**Documento:** `SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`  
**Referencia principal:** `SECURITY_REMEDIATION_PLAN_2026-Q2.md`  
**Indice consolidado:** `SECURITY_DOCUMENTATION_INDEX.md`  
**Objetivo:** acompanhamento curto de execucao semanal  
**Atualizacao esperada:** 1 vez por semana

---

## Como Usar

- Atualize apenas status, bloqueios e evidencias.
- Nao replique detalhes tecnicos extensos aqui.
- Quando um item exigir contexto adicional, referencie o plano principal.

Legenda de status:

- `nao iniciado`
- `em andamento`
- `bloqueado`
- `concluido`

---

## Semana 1

### Clientes: app e web

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Firebase key rotacionada | app + web | concluido (deprecado) | `restaurante-app/.env.example`, `restaurante-web/.env.example`, `restaurante-app/.env.staging`, `restaurante-app/src/config/firebaseConfig.ts`, `restaurante-web/src/config/firebaseConfig.ts` | Decisao final: Firebase nao e requerido no runtime ativo. Variaveis Firebase removidas dos templates de ambiente e item reclassificado para deprecado sem rotacao obrigatoria. |
| `CURSOR_SECRET` sem hardcode | app + web | concluido | `restaurante-app/src/utils/cursorValidation.ts`, `restaurante-web/src/utils/cursorValidation.ts`, `restaurante-app/.env.example`, `restaurante-web/.env.example`, `restaurante-app/scripts/build-android.sh` | Secret aplicado sem hardcode, validado em build app e fluxo web. Smoke de paginacao app/web confirmado como OK em 01/04. |

### App

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Biometria sem senha persistida | app | concluido | `restaurante-app/src/services/BiometricTokenService.ts`, `restaurante-app/src/services/BiometricAuthService.ts`, `restaurante-app/src/context/AuthContext.tsx` | Fluxo biometrico migrou para token ephemeral e removeu replay de senha persistida. |
| Android backup hardening | app | concluido | `restaurante-app/android/app/src/main/res/xml/backup_rules.xml`, `restaurante-app/android/app/src/main/res/xml/data_extraction_rules.xml`, `restaurante-app/android/app/src/main/AndroidManifest.xml` | Backup Android endurecido com exclusao explicita de dados sensiveis. |

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Logs sensiveis saneados | ops | concluido | `restaurante-ops/src/lib/logger.ts`, `restaurante-ops/src/index.ts`, `restaurante-ops/src/modules/billing-operations.ts` | Sanitizacao ativa para email/token/secret/cookie; resposta de erro de billing endurecida para evitar vazamento de detalhes sensiveis |
| Segredos server-only e headers | ops | concluido | `restaurante-ops/src/config/env.ts`, `restaurante-ops/src/index.ts`, `restaurante-ops/README.md`, `restaurante-ops/.env.example` | Boundary server-only documentado; headers minimos ativos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS em producao); exemplos com placeholders |

---

## Semana 2

### App

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Certificate Pinning implementation | app | concluido | `restaurante-app/app.json`, `restaurante-app/android/app/src/main/AndroidManifest.xml`, `restaurante-app/android/app/src/main/res/xml/network_security_config.xml`, `restaurante-app/ios/Espeto/Info.plist`, `restaurante-app/package.json` | Implementado pinning para `supabase.co` (subdominios) e `api.mercadopago.com` com pin leaf + backup CA pin. Necessario manter runbook de rotacao de certificados e renovar pins antes de expiracao de `pin-set` (2027-12-31). |
| Build nativo + MITM testing | app | em andamento | `restaurante-app/app.json`, `restaurante-app/android/app/src/main/res/xml/network_security_config.xml`, `restaurante-app/ios/Espeto/Info.plist` | Configuracao aplicada e validada em config parsing (`expo config --type public`). Pendente validacao final por EAS build e smoke controlado de conexao Supabase + Mercado Pago. |

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Rate limit `429` validado | ops | concluido | `scripts/rate-limit-smoke.sh` (smoke completo em 01/04, 15:37 UTC) | `/auth/login` atinge `429` na tentativa 9/8; `/ops/billing/reconcile` atinge `429` na tentativa 31/30; headers `Retry-After`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset` presentes em ambos |
| Rate limit `503` fail-closed validado | ops | concluido | curl em modo estrito `RATE_LIMIT_FALLBACK_ENABLED=false` com Redis indisponivel (01/04, 15:46 UTC) | `/auth/login` e `/ops/billing/reconcile` retornaram `503` com sessao autenticada valida no billing |

---

## Semana 3

### Clientes: app e web

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| MFA TOTP com Supabase Auth | app + web | concluido | `restaurante-app/src/services/MFAService.ts`, `restaurante-web/src/services/MFAService.ts`, `restaurante-app/src/components/MFAVerificationModal.tsx`, `restaurante-web/src/components/MFAVerificationModal.tsx`, `restaurante-app/src/components/MFASetupModal.tsx`, `restaurante-web/src/components/MFASetupModal.tsx` | Enrollment/challenge/verify em Supabase `auth.mfa` funcionando end-to-end em app e web. UI de setup corrigida (botao no lado correto por plataforma). Validado em producao em 02/04/2026. |
| Session fixation hardening | app + web | concluido | `restaurante-app/src/context/AuthContext.tsx`, `restaurante-web/src/context/AuthContext.tsx`, `restaurante-app/src/screens/LoginScreen.tsx`, `restaurante-web/src/screens/LoginScreen.tsx` | Endurecimento concluido: signOut preventivo antes de login por credenciais e signOut ao cancelar desafio MFA. Validado em runtime controlado em producao em 02/04/2026. |

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Sessao e cookies endurecidos | ops | concluido | `restaurante-ops/src/auth/session.ts`, smoke manual em 01/04 (15:49 UTC) | Login valido acessa `/dashboard` (200); logout limpa `ops_session` com `Max-Age=0` + `Expires=Thu, 01 Jan 1970`; `/dashboard` apos logout ou com cookie invalido retorna `302 /login` |

---

## Semana 3 (continuacao — 2026-04-02)

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| MFA setup e reativacao em ops | ops | concluido | `restaurante-ops/src/modules/ops-security.ts`, `restaurante-ops/src/index.ts` (`GET /security/mfa-setup`), `restaurante-ops/src/views/dashboard.ts`, `database-backup/migrations/20260402002000_disable_ops_mfa_emergency.sql` | MFA desabilitado via migration de emergencia para desbloquear acesso; pagina `/security/mfa-setup` criada; dashboard exibe status TOTP do usuario atual; MFA reativado pelo usuario apos configurar TOTP. Validado em producao em 02/04. |

### Monorepo

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| LicenseGate cobrindo telas operacionais | app + web | concluido | commit `c0b1042` — `restaurante-app/src/screens/NovoPedidoScreen.tsx`, `ComandaGerenciamentoScreen.tsx`, `RotasDeliveryScreen.tsx`, `restaurante-web/src/screens/NovoPedidoScreen.tsx`, `ComandaGerenciamentoScreen.tsx`, `RotasDeliveryScreen.tsx` | Todas as 6 telas operacionais criticas envolvidas com `<LicenseGate>`. Pre-requisito de billing em producao cumprido. Flags `billing_enabled` e `billing_licenseGate` permanecem `false` ate validacao de assinatura ativa no banco. |
| Validacao de assinatura ativa para go-live billing | monorepo | concluido | consulta service role em `subscriptions` (company_id `f85bfdc2-982a-4cf7-b176-bce68426f861`) | Resultado em 04/04: sem registro `status='active'`; assinatura atual em `trialing`. Billing deve permanecer desativado em producao ate existir assinatura ativa conforme criterio de go-live. |

---

## Semana 4

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Billing/reconcile smoke controlado | ops | em andamento | smoke local em 01/04 (15:53 UTC): `POST /ops/billing/reconcile`, `POST /ops/billing/company/{id}/regularize/card`, consulta service role em `invoices`, helper `npm run billing:candidates` | Guardrails validados (`400` para `idempotencyKey`/`invoiceId` invalidos) e `404 INVOICE_ACTION_TARGET_NOT_FOUND`; consulta direta retornou `[]` para invoices `pending/failed`, bloqueando replay de sucesso com mesmo `idempotency_key` sem mutar dados |

### Monorepo

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Evidencias consolidadas | monorepo | nao iniciado |  | Referenciar runbook interno quando existir |
| Pendencias residuais avaliadas | monorepo | nao iniciado |  | Decidir o que fica para proximo ciclo |

---

## Bloqueios Atuais

| Item | Status | Dono | Proximo passo |
|------|--------|------|---------------|
| Railway CLI sem autenticacao valida para deploy de variaveis | aberto | time | Impacta o web no Railway. Executar deploy de `restaurante-web` via Railway UI enquanto `railway whoami` retorna `Unauthorized`; renovar com `railway login` quando possivel |
| Ambiente de staging dedicado inexistente | aberto | time | Usar validacao controlada em producao ate existir ambiente formal |
| Supabase Auth MFA TOTP ainda desabilitado em runtime | concluido (2026-04-02) | app + web | MFA TOTP validado end-to-end em producao. Enrollment, desafio e verificacao confirmados para roles privilegiadas em app e web. |
| Validacao MITM automatizada para pinning ainda pendente | monitoramento | app | Executar EAS build e testes controlados de conectividade (Supabase/Mercado Pago) antes de promover mudanca como 100% validada em producao |
| OPS-4 sem invoice elegivel para replay de sucesso | aberto | ops | Repetir smoke quando existir invoice `pending` ou `failed`; usar `npm run billing:candidates` para localizar candidatos antes do replay |

---

## Definicao de Pronto do Ciclo

- Nenhum segredo hardcoded em clientes ou exemplos publicos.
- App sem replay biometrico baseado em senha persistida.
- MFA funcional para roles privilegiadas em app e web.
- `restaurante-ops` com logs saneados, rate limit validado e smoke de billing registrado.
