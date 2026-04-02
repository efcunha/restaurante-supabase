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
| Certificate Pinning evaluation | app | concluido (CONDITIONAL) | `docs/security/SECURITY_REMEDIATION_PLAN_2026-Q2.md`, `restaurante-app/package.json` | Gate formal: **CONDITIONAL (NO-GO neste ciclo)**. Justificativa objetiva: sem staging dedicado, sem esteira de MITM regression automatizada e alto risco operacional de lockout em rotacao de certificado/rede intermediaria. |
| Build nativo + MITM testing | app | bloqueado (dependente de gate GO) |  | Mitigacao alternativa ativa: TLS padrao + HSTS no `ops` + monitoramento de expiracao de certificado + hardening de sessao/MFA. Reavaliar pinning com pre-requisitos de observabilidade e rollback nativo. |

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
| MFA TOTP com Supabase Auth | app + web | em andamento | `restaurante-app/src/services/MFAService.ts`, `restaurante-web/src/services/MFAService.ts`, `restaurante-app/src/components/MFAVerificationModal.tsx`, `restaurante-web/src/components/MFAVerificationModal.tsx` | Implementacao iniciada: enrollment/challenge/verify em Supabase (`auth.mfa`), modal migrado de resolver Firebase para resolver Supabase e backup codes locais mantidos. |
| Session fixation hardening | app + web | em andamento | `restaurante-app/src/context/AuthContext.tsx`, `restaurante-web/src/context/AuthContext.tsx`, `restaurante-app/src/screens/LoginScreen.tsx`, `restaurante-web/src/screens/LoginScreen.tsx` | Endurecimento aplicado: signOut preventivo antes de login por credenciais e signOut ao cancelar desafio MFA. Pendente validar runtime controlado app/web apos deploy. |

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Sessao e cookies endurecidos | ops | concluido | `restaurante-ops/src/auth/session.ts`, smoke manual em 01/04 (15:49 UTC) | Login valido acessa `/dashboard` (200); logout limpa `ops_session` com `Max-Age=0` + `Expires=Thu, 01 Jan 1970`; `/dashboard` apos logout ou com cookie invalido retorna `302 /login` |

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
| Supabase Auth MFA TOTP ainda desabilitado em runtime | aberto | app + web | Habilitar `auth.mfa.totp.enroll_enabled=true` e `verify_enabled=true` no projeto Supabase alvo, depois executar smoke de login privilegiado com desafio TOTP |
| Pinning com gate CONDITIONAL (NO-GO neste ciclo) | monitoramento | app | Reavaliar em novo ciclo quando houver staging, runbook de rotacao/pinning e suite de teste MITM automatizada |
| OPS-4 sem invoice elegivel para replay de sucesso | aberto | ops | Repetir smoke quando existir invoice `pending` ou `failed`; usar `npm run billing:candidates` para localizar candidatos antes do replay |

---

## Definicao de Pronto do Ciclo

- Nenhum segredo hardcoded em clientes ou exemplos publicos.
- App sem replay biometrico baseado em senha persistida.
- MFA funcional para roles privilegiadas em app e web.
- `restaurante-ops` com logs saneados, rate limit validado e smoke de billing registrado.
