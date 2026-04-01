# Status Semanal de Remediacao - Q2 2026

**Documento:** `SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`  
**Referencia principal:** `SECURITY_REMEDIATION_PLAN_2026-Q2.md`  
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
| Firebase key rotacionada | app + web | em andamento | `restaurante-app/.env.example`, `restaurante-web/.env.example`, `restaurante-app/src/config/firebaseConfig.ts`, `restaurante-web/src/config/firebaseConfig.ts`, `docs/security/SEC-W1-001-FIREBASE-RUNTIME-ASSESSMENT-2026-04-01.md` | Placeholder saneado. Deploy alvo: app via EAS/Expo env (novo build), web via Railway. Observacao: backend principal e Supabase; avaliacao de 01/04 indica Firebase em trilha legada sem reachability clara no runtime ativo. Fechar gate de decisao antes de forcar rotacao em producao. |
| `CURSOR_SECRET` sem hardcode | app + web | concluido | `docs/security/SEC-W1-002-CURSOR-SECRET-DEPLOYMENT.md`, `restaurante-app/src/utils/cursorValidation.ts`, `restaurante-web/src/utils/cursorValidation.ts`, `.env.example` em ambos | Secret gerado: `9f05e59a28393b3c7684abf8f98d9d226a1a47ea1383ba7c74b04be89d868fd6` (01/04, 16:15 UTC). Aplicado em `restaurante-web` (Railway) e validado no app build local. Logs web sem `CURSOR_SECRET not configured`. Smoke de paginacao app/web confirmado como OK pelo operador em 01/04. |

### App

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Biometria sem senha persistida | app | concluido | `docs/security/SEC-W1-003-BIOMETRIC-HARDENING-COMPLETE.md`, `restaurante-app/src/services/BiometricTokenService.ts` (NOVO), `restaurante-app/src/services/BiometricAuthService.ts` (removidas storeCredentials/getCredentials), `restaurante-app/src/context/AuthContext.tsx` (atualizado loginWithBiometric/login/logout) | BiometricTokenService implementado com token ephemeral + hash SHA-256. storeCredentials/getCredentials removidas. loginWithBiometric agora usa refreshSession server-side ao invés de password replay. TypeScript validation: ✅ Passou. Próximos: testes unitários + E2E + deploy EAS. |
| Android backup hardening | app | concluido | `docs/security/SEC-W1-004-ANDROID-BACKUP-COMPLETE.md`, `restaurante-app/android/app/src/main/res/xml/backup_rules.xml` (NOVO), `restaurante-app/android/app/src/main/res/xml/data_extraction_rules.xml` (NOVO), `restaurante-app/android/app/src/main/AndroidManifest.xml` (atualizado) | backup_rules.xml + data_extraction_rules.xml criados com exclusões de biometric/session/token/cache. AndroidManifest referencia ambos. allowBackup=true + explicitly excluded sensitive data. Próximos: EAS build + teste manual. |

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
| Decision gate de pinning | app | nao iniciado |  | Aprovar ou descartar apos prova de conceito |
| Build nativo validado | app | nao iniciado |  | Somente se pinning for aprovado |

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
| MFA TOTP com Supabase Auth | app + web | nao iniciado |  | Reimplementar `MFAService` |
| Session fixation hardening | app + web | em andamento | `restaurante-app/src/context/AuthContext.tsx`, `restaurante-web/src/context/AuthContext.tsx` | `signOut()` preventivo aplicado e deduplicacao de `reloadUserData` adicionada para reduzir corrida `INITIAL_SESSION`/`SIGNED_IN` e evitar `SIGNED_OUT` transitorio apos restore. Pendente: validar em runtime apos novo deploy que 403/406 de sessao nao reaparecem no cold start. |

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
| MFA ainda legado da migracao Firebase -> Supabase | aberto | app + web | Reimplementar sobre Supabase Auth |
| Pinning ainda sem decisao tecnica final | aberto | app | Fazer prova de conceito antes de comprometer backlog |
| OPS-4 sem invoice elegivel para replay de sucesso | aberto | ops | Repetir smoke quando existir invoice `pending` ou `failed`; usar `npm run billing:candidates` para localizar candidatos antes do replay |

---

## Definicao de Pronto do Ciclo

- Nenhum segredo hardcoded em clientes ou exemplos publicos.
- App sem replay biometrico baseado em senha persistida.
- MFA funcional para roles privilegiadas em app e web.
- `restaurante-ops` com logs saneados, rate limit validado e smoke de billing registrado.

---

## Evidencia Pos-Deploy (Template Rapido)

Preencher apos deploy/validacao para encerrar `SEC-W1-002` e fechar gate de decisao de `SEC-W1-001`.

| Campo | Valor |
|------|-------|
| Data/hora da execucao | PREENCHER |
| Executor | PREENCHER |
| Alvos atualizados | `restaurante-app` (EAS/Expo env), `restaurante-web` (Railway) |
| Variaveis aplicadas | `CURSOR_SECRET` |
| Resultado build app (EAS) | PREENCHER (`ok`/`falha`) |
| Resultado redeploy web | PREENCHER (`ok`/`falha`) |
| Smoke login/auth | PREENCHER (`ok`/`falha` + evidencia) |
| Smoke cursor pagination | PREENCHER (`ok`/`falha` + evidencia) |
| Sentry sem erro de chave/secret faltante | PREENCHER (`sim`/`nao`) |
| Status final SEC-W1-001 | PREENCHER (`gate_fechado`/`pendente`) |
| Status final SEC-W1-002 | PREENCHER (`concluido`/`pendente`) |

Resposta rapida (copiar e preencher):

- app_eas_env_cursor_secret: ok/falha
- app_build_com_env: ok/falha
- smoke_paginacao_app: ok/falha
- smoke_paginacao_web: ok/falha
- logs_web_sem_cursor_secret_not_configured: sim/nao
- status_final_sec_w1_002: concluido/pendente
- status_final_sec_w1_001: gate_fechado/pendente