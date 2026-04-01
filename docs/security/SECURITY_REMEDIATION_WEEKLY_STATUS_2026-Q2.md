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
| Firebase key rotacionada | app + web | em andamento | `restaurante-app/.env.example`, `restaurante-web/.env.example` | Placeholder saneado; ainda falta rotacao/validacao de ambiente |
| `CURSOR_SECRET` sem hardcode | app + web | em andamento | `restaurante-app/src/utils/cursorValidation.ts`, `restaurante-web/src/utils/cursorValidation.ts`, `restaurante-app/src/services/optimization/CursorPaginationService.ts`, `restaurante-web/src/services/optimization/CursorPaginationService.ts` | Hardcodes removidos; ainda falta configurar secret nos ambientes reais |

### App

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Biometria sem senha persistida | app | nao iniciado |  | Migrar para token local + refresh server-side |
| Android backup hardening | app | nao iniciado |  | Validar estrategia de `allowBackup` + regras XML |

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
| Session fixation hardening | app + web | em andamento | `restaurante-app/src/context/AuthContext.tsx`, `restaurante-web/src/context/AuthContext.tsx` | `signOut()` preventivo aplicado; ainda falta remover dependencia de replay biometrico por senha |

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Sessao e cookies endurecidos | ops | concluido | `restaurante-ops/src/auth/session.ts`, smoke manual em 01/04 (15:49 UTC) | Login valido acessa `/dashboard` (200); logout limpa `ops_session` com `Max-Age=0` + `Expires=Thu, 01 Jan 1970`; `/dashboard` apos logout ou com cookie invalido retorna `302 /login` |

---

## Semana 4

### Ops

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Billing/reconcile smoke controlado | ops | em andamento | smoke local em 01/04 (15:53 UTC): `POST /ops/billing/reconcile`, `POST /ops/billing/company/{id}/regularize/card` | Guardrails validados (`400` para `idempotencyKey`/`invoiceId` invalidos) e `404 INVOICE_ACTION_TARGET_NOT_FOUND` sem invoice elegivel; falta cenario com invoice pendente/falha para validar replay de sucesso com mesmo `idempotency_key` |

### Monorepo

| Item | Escopo | Status | Evidencia | Observacoes |
|------|--------|--------|-----------|-------------|
| Evidencias consolidadas | monorepo | nao iniciado |  | Referenciar runbook interno quando existir |
| Pendencias residuais avaliadas | monorepo | nao iniciado |  | Decidir o que fica para proximo ciclo |

---

## Bloqueios Atuais

| Item | Status | Dono | Proximo passo |
|------|--------|------|---------------|
| Ambiente de staging dedicado inexistente | aberto | time | Usar validacao controlada em producao ate existir ambiente formal |
| MFA ainda legado da migracao Firebase -> Supabase | aberto | app + web | Reimplementar sobre Supabase Auth |
| Pinning ainda sem decisao tecnica final | aberto | app | Fazer prova de conceito antes de comprometer backlog |
| OPS-4 sem invoice elegivel para replay de sucesso | aberto | ops | Repetir smoke com empresa que tenha invoice `pending` ou `failed` para validar idempotencia de sucesso (`alreadyProcessed`) |

---

## Definicao de Pronto do Ciclo

- Nenhum segredo hardcoded em clientes ou exemplos publicos.
- App sem replay biometrico baseado em senha persistida.
- MFA funcional para roles privilegiadas em app e web.
- `restaurante-ops` com logs saneados, rate limit validado e smoke de billing registrado.