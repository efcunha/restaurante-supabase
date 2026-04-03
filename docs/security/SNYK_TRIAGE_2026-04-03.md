# Snyk Triage - 2026-04-03

## Objetivo
Classificar os alertas do Snyk em **bloqueantes reais** vs **falsos positivos/documentados** para reduzir ruido no VS Code Problems e orientar correcoes priorizadas.

## Escopo
- restaurante-ops (backend operacional)
- restaurante-app (scripts e app)
- restaurante-web (scripts e web)

## Bloqueantes Reais (corrigir imediatamente)
1. Hardcoded password no seed de teste (corrigido nesta sessao)
- Arquivo: `restaurante-app/scripts/seed-test-db.ts`
- Acao: senha fixa removida, com `TEST_SEED_USER_PASSWORD` + fallback randomico.
- Status: **Resolvido**.

2. Uso de senha fixa no script de diagnostico (corrigido nesta sessao)
- Arquivo: `restaurante-app/test-supabase.js`
- Acao: senha invalida passou a vir de `SUPABASE_DIAG_BAD_PASSWORD` com fallback dinamico.
- Status: **Resolvido**.

## Falsos Positivos / Ruido (monitorar e manter documentado)
1. XSS no `restaurante-ops/src/index.ts`
- Motivo: fluxo de taint do Snyk (headers/URL -> `res.end`) mesmo com escape/sanitizacao aplicada.
- Mitigacao aplicada:
  - sanitizacao defensiva de user antes de render HTML;
  - `respondJson` com sanitizacao de strings JSON;
  - respostas HTML com `escapeHtml`.
- Acao operacional: manter monitoramento e testes de regressao de rendering.

2. HttpToHttps no `restaurante-ops/src/index.ts`
- Motivo: servidor Node HTTP por design em ambiente com terminacao TLS no edge (Railway/proxy).
- Mitigacao aplicada:
  - enforcement de HTTPS em producao (`x-forwarded-proto` / TLS check);
  - redirect/bloqueio de request insegura.

3. Path Traversal em scripts `phase12-profile.js` (app/web)
- Arquivos:
  - `restaurante-app/scripts/phase12-profile.js`
  - `restaurante-web/scripts/phase12-profile.js`
- Motivo: heuristica de taint do Snyk em CLI args, mesmo com validacao.
- Mitigacao aplicada:
  - allowlist estrita de `--env` (`.env.development`, `.env.staging`, `.env.production`, `.env.local`, `.env.test`);
  - leitura/escrita apenas para arquivo validado.

4. HardcodedNonCryptoSecret em `CARDAPIO_CACHE_KEY`
- Motivo: chave de namespace AsyncStorage detectada como segredo.
- Risco real: baixo (nao e credencial/token).

5. HardcodedPassword em validacao de senha nas telas de reset
- Arquivos:
  - `restaurante-app/src/screens/ResetPasswordScreen.tsx`
  - `restaurante-web/src/screens/ResetPasswordScreen.tsx`
- Motivo: falso positivo de semantica de nome/fluxo.
- Risco real: baixo.

## Mudancas de hardening aplicadas nesta sessao
- `restaurante-ops/src/index.ts`:
  - sanitizacao de dados de user para HTML;
  - sanitizacao de payload JSON em respostas;
  - enforcement de HTTPS em producao;
  - padronizacao de respostas JSON via helper.
- `restaurante-app/scripts/seed-test-db.ts`:
  - remocao de senha hardcoded.
- `restaurante-app/test-supabase.js`:
  - remocao de senha hardcoded em diagnostico.
- `restaurante-app/scripts/phase12-profile.js`:
  - validacao strict allowlist para `--env`.
- `restaurante-web/scripts/phase12-profile.js`:
  - validacao strict allowlist para `--env`.

## Recomendacao Operacional
1. Priorizar triagem por codigo proprio (`src/` e `scripts/`), nao por `node_modules`.
2. Usar Snyk em modo CI com baseline/policy para evitar regressao de novos issues reais.
3. Revisar dependencias em lote (SCA) separadamente da triagem SAST para nao misturar prioridades.
4. Manter expiracao de ignores para revalidacao periodica (trimestral/semestral).

## Checklist Copiavel para PR (Security Gate)

Use este bloco no PR quando houver mudanca em auth, RLS, billing, CORS, rate limiting, secrets, roles, PII ou Edge Functions.

```text
🔒 Security Gate — Checklist obrigatório para esta mudança:

[ ] Nenhum secret hardcoded (verificado em todo código proposto)
[ ] Menor privilégio aplicado: service role key não exposta ao cliente
[ ] Input validation presente em todas as bordas do sistema afetadas
[ ] RLS cobre os novos dados/tabelas envolvidos
[ ] CORS/headers de segurança preservados ou endurecidos
[ ] Logs não expõem PII em texto claro
[ ] Idempotência garantida em operações de billing/webhook
[ ] Smoke test planejado para validação pós-deploy
[ ] LGPD verificada (se PII envolvido)
[ ] Evidência de validação será documentada no mesmo ciclo de trabalho
```

## Snapshot de Decisao (para colar no PR)

```text
Snyk triage snapshot (2026-04-03)

- Bloqueantes reais corrigidos nesta entrega:
  - restaurante-app/scripts/seed-test-db.ts (hardcoded password removido)
  - restaurante-app/test-supabase.js (senha fixa de diagnóstico removida)

- Achados residuais tratados como falso positivo documentado:
  - restaurante-ops/src/index.ts (XSS taint e HttpToHttps)
  - restaurante-app/scripts/phase12-profile.js (Path Traversal heurístico)
  - restaurante-web/scripts/phase12-profile.js (Path Traversal heurístico)

- Mitigações implementadas:
  - Sanitização defensiva de HTML/JSON no ops
  - Enforcement de HTTPS em produção no ops
  - Allowlist estrita para argumento --env nos scripts phase12
```
