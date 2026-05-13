# restaurante-supabase

Monorepo POS/PDV para restaurantes com app mobile, web, servico operacional e infraestrutura de banco.

POS monorepo for restaurants with mobile app, web app, operations service, and database infrastructure.

## Testar Restaurante Web / Try Restaurante Web

Teste a versao web em producao:

- [https://restaurante-web.app.br/login](https://restaurante-web.app.br/login)

Try the production web version:

- [https://restaurante-web.app.br/login](https://restaurante-web.app.br/login)

## Open Source Security First / Seguranca Open Source Primeiro

Este repositorio foi preparado para uso open source sem publicar credenciais de producao.

This repository is prepared for open source usage without exposing production credentials.

Regras obrigatorias (PT):

- Nunca commitar arquivos `.env.local`, `.env`, tokens, senhas ou chaves privadas.
- Somente arquivos `.env.example` e `.env.*.example` devem ficar versionados.
- Cada pessoa deve criar e usar as proprias credenciais no seu ambiente.
- Deploy so pode ser executado com variaveis explicitas de ambiente.

Mandatory rules (EN):

- Never commit `.env.local`, `.env`, tokens, passwords, or private keys.
- Only `.env.example` and `.env.*.example` files should be versioned.
- Each contributor must create and use their own credentials locally.
- Deploy must run only with explicit environment variables.

## Estrutura do Monorepo / Monorepo Structure

- `restaurante-app/`: app mobile React Native + Expo.
- `restaurante-web/`: app web (Expo Web) + E2E.
- `restaurante-ops/`: backend operacional (auth, metricas, billing/reconcile).
- `restaurante-site/`: site institucional.
- `database-backup/`: migrations, backup e restore.
- `scripts/`: scripts de uso transversal do monorepo.
- `docs/`: documentacao tecnica, seguranca, LGPD e operacao.

- `restaurante-app/`: React Native + Expo mobile app.
- `restaurante-web/`: web app (Expo Web) + E2E.
- `restaurante-ops/`: operational backend (auth, metrics, billing/reconcile).
- `restaurante-site/`: institutional website.
- `database-backup/`: migrations, backup, and restore.
- `scripts/`: shared monorepo scripts.
- `docs/`: technical docs, security, LGPD, and operations.

## Pre-requisitos / Prerequisites

- Node.js 20+
- pnpm 10.33+
- Git
- Railway CLI (deploy Railway)
- Supabase CLI + PostgreSQL client tools (quando houver migrations/backup)
- EAS CLI (build mobile via Expo)

- Node.js 20+
- pnpm 10.33+
- Git
- Railway CLI (Railway deploys)
- Supabase CLI + PostgreSQL client tools (when using migrations/backup)
- EAS CLI (Expo mobile builds)

## Quick Start Seguro / Secure Quick Start

1. Clone e instale dependencias:

1. Clone and install dependencies:

```bash
git clone <repo-url>
cd restaurante-supabase
pnpm install
```

2. Gere arquivos locais de ambiente (sem credenciais reais):

3. Generate local environment files (without real credentials):

```bash
bash scripts/open-source/setup-preflight-check.sh
bash scripts/open-source/setup-env.sh
```

No Windows PowerShell / On Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-preflight-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-env.ps1
```

3. Configure Supabase e Railway com seus proprios dados:

4. Configure Supabase and Railway with your own data:

```bash
bash scripts/open-source/setup-supabase-project.sh --project-ref <your-project-ref>
bash scripts/open-source/setup-railway-project.sh --workspace "<your-workspace>" --project "<your-project>" --environment "production"
```

No Windows PowerShell / On Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-supabase-project.ps1 -ProjectRef <your-project-ref>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-railway-project.ps1 -Workspace "<your-workspace>" -Project "<your-project>" -Environment "production"
```

4. Preencha manualmente os arquivos `.env.local` gerados com suas proprias credenciais.

5. Manually fill the generated `.env.local` files with your own credentials.

6. Rode validacoes locais:

7. Run local validations:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Matriz de Variaveis de Ambiente / Environment Variables Matrix

### restaurante-app

Arquivo local / Local file: `restaurante-app/.env.local`

Minimo esperado (PT) / Minimum required (EN):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN` (opcional / optional)
- `EXPO_PUBLIC_FIREBASE_*` (se usar Firebase / if using Firebase)

### restaurante-web

Arquivo local / Local file: `restaurante-web/.env.local`

Minimo esperado (PT) / Minimum required (EN):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` for E2E

### restaurante-ops

Arquivo local / Local file: `restaurante-ops/.env.local`

Minimo esperado (PT) / Minimum required (EN):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente backend / backend only)
- `PORT`
- `OPS_ENV`

### restaurante-site

Arquivo local / Local file: `restaurante-site/.env.local`

Minimo esperado (PT):

- Variaveis descritas em `restaurante-site/.env.example`

Minimum required (EN):

- Variables described in `restaurante-site/.env.example`

### database-backup

Arquivo local / Local file: `database-backup/.env.local`

Minimo esperado (PT) / Minimum required (EN):

- `SOURCE_DB_HOST`, `SOURCE_DB_USER`, `SOURCE_DB_PASSWORD`, `SOURCE_DB_NAME`
- `TARGET_DB_HOST`, `TARGET_DB_USER`, `TARGET_DB_PASSWORD`, `TARGET_DB_NAME`

## Implantacao Segura (Railway) / Secure Deployment (Railway)

Os scripts de deploy nao usam credenciais hardcoded.

Deploy scripts do not use hardcoded credentials.

Variaveis obrigatorias para deploy (PT) / Required deploy variables (EN):

- `RAILWAY_WORKSPACE`
- `RAILWAY_PROJECT`
- `RAILWAY_ENVIRONMENT`

### Deploy por servico / Deploy per service

```bash
# Ops
cd restaurante-ops
bash scripts/deploy-railway.sh

# Web
cd ../restaurante-web
bash scripts/deploy-railway.sh

# Site
cd ../restaurante-site
bash scripts/deploy-railway.sh
```

### Deploy orquestrado (novo) / Orchestrated deploy (new)

```bash
bash scripts/open-source/deploy-railway-all.sh
```

No Windows PowerShell / On Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/deploy-railway-all.ps1
```

Documentacao dos novos scripts / New scripts documentation:

- `scripts/open-source/README.md`

Scripts de provisionamento clean / Clean provisioning scripts:

- `scripts/open-source/setup-preflight-check.sh`
- `scripts/open-source/setup-preflight-check.ps1`
- `scripts/open-source/setup-railway-project.sh`
- `scripts/open-source/setup-railway-project.ps1`
- `scripts/open-source/setup-supabase-project.sh`
- `scripts/open-source/setup-supabase-project.ps1`

## Mobile Build (EAS)

No app mobile / In the mobile app:

```bash
cd restaurante-app
bash scripts/deploy-eas.sh
```

Observacoes (PT):

- `eas login` deve ser feito com a conta do mantenedor do fork/projeto.
- Keystore e credenciais de build devem ser configurados no ambiente do usuario.

Notes (EN):

- `eas login` must use the fork/project maintainer account.
- Keystore and build credentials must be configured in the user environment.

## Politica de Segredos / Secrets Policy

- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Nunca publicar tokens de pagamento, webhook ou admin em codigo e docs.
- Nunca manter credenciais em scripts versionados.
- Use gerenciador de segredos da plataforma de deploy.

- Never use `SUPABASE_SERVICE_ROLE_KEY` on the client side.
- Never publish payment, webhook, or admin tokens in code or docs.
- Never keep credentials in versioned scripts.
- Use your deployment platform secret manager.

Checklist rapido antes de abrir PR (PT):

- [ ] Nenhum arquivo `.env` real foi versionado
- [ ] Nenhum token/senha/chave foi adicionado em codigo ou docs
- [ ] `.env.example` atualizado quando variavel nova foi criada
- [ ] README e docs atualizados para novo fluxo tecnico

Quick checklist before opening a PR (EN):

- [ ] No real `.env` file was versioned
- [ ] No token/password/key was added to code or docs
- [ ] `.env.example` updated when a new variable was created
- [ ] README and docs updated for new technical flow

## Fluxo Recomendado Para Open Source / Recommended Open Source Flow

1. Rodar setup local por templates.
2. Configurar credenciais proprias.
3. Validar build/lint/typecheck.
4. Fazer deploy apenas com variaveis explicitas de ambiente.
5. Executar smoke tests dos fluxos criticos apos deploy.

6. Run local setup from templates.
7. Configure your own credentials.
8. Validate build/lint/typecheck.
9. Deploy only with explicit environment variables.
10. Execute smoke tests for critical flows after deploy.

## Referencias de Documentacao / Documentation References

- `docs/README.md`
- `docs/security/README.md`
- `docs/LGPD/README.md`
- `docs/saas-billing/README.md`
- `docs/repository/DOMAINS.md`

## Observacao Importante Sobre Historico Git / Important Note About Git History

Se este repositorio for publicado publicamente, recomenda-se limpar historico para remover artefatos antigos que possam ter referencias sensiveis e, em seguida, rotacionar credenciais de producao.

If this repository is published publicly, it is recommended to clean git history to remove old artifacts that may include sensitive references, and then rotate production credentials.

## Licenca / License

Este projeto e distribuido sob a licenca MIT. Consulte o arquivo `LICENSE` na raiz para os termos completos.

This project is distributed under the MIT License. See the root `LICENSE` file for the full terms.
