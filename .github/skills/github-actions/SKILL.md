---
name: github-actions
description: Local minimal skill for CI/GitHub Actions workflows, build artifacts, mobile builds, and deployment automation in restaurante-supabase.
---

# Skill: GitHub Actions & CI (Local Minimal)

## Objetivo

Guiar automacao de CI/CD com foco em:

- Build e teste automatizado (restaurante-app, restaurante-web, restaurante-ops)
- Artefatos mobile (APK emulador, Simulator iOS)
- Validacao E2E critica
- Deploy seguro em producao

## Estrutura de Workflows

Workflows existentes em `.github/workflows/`:

- `security.yml` — gate de aprovacao (job `deploy` é manual)
- `build-mobile-artifacts.yml` (se existir) — APK + IPA builders
- Testes E2E por repositorio (`restaurante-app` Maestro, `restaurante-web` Playwright)

## Padroes Operacionais

### Build Mobile (Android + iOS)

- **APK (Android)**:
  - Usar `eas build --platform android --profile preview`
  - Outputar para `./artifacts/app-preview.apk`
  - Validar com `adb install-multiple` em emulador

- **Simulator (iOS)**:
  - Usar `eas build --platform ios --profile preview` + `--local`
  - Outputar para `./artifacts/app-ios-simulator.tar.gz`
  - Descompactar em CI: `cd ./artifacts && tar xz -f app-ios-simulator.tar.gz`

### E2E Critico (Workflow)

- **Prerequisito**: APK/Simulator artifacts prontos.
- **Maestro (app nativa)**:
  ```bash
  cd restaurante-app
  maestro test .maestro/balcao.yaml --udid emulator-5554 \
    -e PLAYWRIGHT_TEST_EMAIL=$PLAYWRIGHT_TEST_EMAIL \
    -e PLAYWRIGHT_TEST_PASSWORD=$PLAYWRIGHT_TEST_PASSWORD
  ```
- **Playwright (web)**:
  ```bash
  cd restaurante-web
  npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts \
    e2e/pizza.spec.ts e2e/delivery.spec.ts --workers=1
  ```

### Deploy Producao (restaurante-ops)

- Use `railway up` do repoitorio local (nao `railway link`):
  ```bash
  cd restaurante-ops
  railway up --service restaurante-ops --path-as-root ./restaurante-ops
  ```
- Validar rate limit no login: esperar 429 + headers dentro de 1h.
- Smoke test: `curl https://ops.restaurante-web.app.br/health`

### Monorepo Deploy Strategy

- Estrutura: `restaurante-app/`, `restaurante-web/`, `restaurante-ops/`, `database-backup/`
- Deploy independente por servico; evitar root autodetection Rails.
- Use `--path-as-root` explicitamente para restaurante-ops.

## Artefatos & Download

### Salvar Artefatos (CI)

```yaml
- name: Upload APK
  uses: actions/upload-artifact@v4
  with:
    name: app-apk-preview
    path: ./artifacts/app-preview.apk
    retention-days: 7

- name: Upload iOS Simulator
  uses: actions/upload-artifact@v4
  with:
    name: app-ios-simulator
    path: ./artifacts/app-ios-simulator.tar.gz
    retention-days: 7
```

### Download Artefatos (Local)

```bash
# List artifacts de uma run
gh run view <run-id> --log

# Download direto
gh run download <run-id> -n app-apk-preview -D ./downloads/
gh run download <run-id> -n app-ios-simulator -D ./downloads/

# Instalar APK em emulador
adb install-multiple ./downloads/app-preview.apk

# Descompactar iOS Simulator
cd ./downloads
tar xz -f app-ios-simulator.tar.gz
# Simulator pronto em ./Simulator-<hash>.app
```

## Testes & Validacao

### Unit + Integration

```bash
npm test
```

### Performance (Snapshot de TTI, FPS)

```bash
npm run test:performance
```

### E2E Maestro (app nativa)

- Prerequisito: emulador running ou device conectado
- Rodado em CI: após build APK/Simulator
- Timeout: 5 min per flow

### E2E Playwright (web)

- Rodado em CI ou local
- Timeout: 30s per spec
- Workers: 1 (serial) para estabilidade

## Seguranca & Secrets

### Env Vars em CI

- Nao hardcodar em workflow YAML.
- Usar GitHub Secrets: `PLAYWRIGHT_TEST_EMAIL`, `PLAYWRIGHT_TEST_PASSWORD`, etc.
- Declarar em `.env.example` sem valores; CI injecta via `secrets.<name>`.

### Credenciais de Deploy

- Railway token em Secret: `RAILWAY_TOKEN`
- Supabase key em Secret: `SUPABASE_ACCESS_TOKEN`
- Chaves publicaveis (anon keys) podem estar em `.env.local` (gitignored).

## Monitoramento Pos-Deploy

### Health Check

```bash
curl https://ops.restaurante-web.app.br/health
# Response esperada: 200 OK, { status: "ok" }
```

### Rate Limiting Validation

- Hit `/auth/login` >100 vezes em <1h.
- Esperar `HTTP 429` com headers `RateLimit-*`.
- Falha: erro de rate limiter (check Redis).

### Logs

```bash
# Supabase logs (últimas 24h)
supabase logs pull

# Railway logs
railway logs
```

## Anti-Padrões

- ❌ Hardcodar API URL ou credencial em workflow.
- ❌ Reutilizar artefato de build antiga sem invalidar cache.
- ❌ Skip E2E critico em deploy producao.
- ❌ Usar `master` branch para build; sempre tag ou PR merge.

## Checklist Antes de Merge (Deploy)

1. Todos os testes locais passados?
2. APK + iOS Simulator artifacts gerados?
3. Maestro balcao.yaml | mesa.yaml | pizza.yaml | delivery.yaml passou?
4. Playwright balcao.spec.ts | mesa.spec.ts | pizza.spec.ts | delivery.spec.ts passou?
5. Rate limit validation em staging/prod passou?
6. Sentry error rate nao aumentou?
7. Logs de API nao mostram erros de seguranca (401, 403)?

## Deploy via gh CLI (Stacked PRs)

```bash
# Criar PR e validar CI
gh pr create --title "Feature X" --body "description"
gh pr view <pr-id> --json statusCheckRollup

# Merge safe com squash
gh pr merge <pr-id> --squash --auto

# Merge sequence (manual stacked)
gh pr merge <pr-1> --squash
gh pr merge <pr-2> --squash
# ... repeat
```

## Status no Projeto (Mar/2026)

- E2E Maestro (app): bloqueador conhecido em login → NovoPedido (credencial/profiles issue).
- E2E Playwright (web): balcao, mesa, pizza, delivery flows validados.
- Rate limit hardening: Redis-first, fail-closed em `restaurante-ops`.
- Supabase CLI via Scoop: `C:\Users\ECUNHA\scoop\shims\supabase.exe`.
- Deploy Railway deve usar o comando `railway` com `--service` e `--path-as-root` conforme runbook acima.
