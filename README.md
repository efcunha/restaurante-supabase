# restaurante-supabase

Monorepo POS/PDV para restaurantes com app mobile, web, servico operacional e infraestrutura de banco.

## Open Source Security First

Este repositorio foi preparado para uso open source sem publicar credenciais de producao.

Regras obrigatorias:

- Nunca commitar arquivos `.env.local`, `.env`, tokens, senhas ou chaves privadas.
- Somente arquivos `.env.example` e `.env.*.example` devem ficar versionados.
- Cada pessoa deve criar e usar as proprias credenciais no seu ambiente.
- Deploy so pode ser executado com variaveis explicitas de ambiente.

## Estrutura do Monorepo

- `restaurante-app/`: app mobile React Native + Expo.
- `restaurante-web/`: app web (Expo Web) + E2E.
- `restaurante-ops/`: backend operacional (auth, metricas, billing/reconcile).
- `restaurante-site/`: site institucional.
- `database-backup/`: migrations, backup e restore.
- `scripts/`: scripts de uso transversal do monorepo.
- `docs/`: documentacao tecnica, seguranca, LGPD e operacao.

## Pre-requisitos

- Node.js 20+
- pnpm 10.33+
- Git
- Railway CLI (deploy Railway)
- Supabase CLI + PostgreSQL client tools (quando houver migrations/backup)
- EAS CLI (build mobile via Expo)

## Quick Start Seguro

1. Clone e instale dependencias:

```bash
git clone <repo-url>
cd restaurante-supabase
pnpm install
```

2. Gere arquivos locais de ambiente (sem credenciais reais):

```bash
bash scripts/open-source/setup-preflight-check.sh
bash scripts/open-source/setup-env.sh
```

No Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-preflight-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-env.ps1
```

3. Configure Supabase e Railway com seus proprios dados:

```bash
bash scripts/open-source/setup-supabase-project.sh --project-ref <seu-project-ref>
bash scripts/open-source/setup-railway-project.sh --workspace "<seu-workspace>" --project "<seu-project>" --environment "production"
```

No Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-supabase-project.ps1 -ProjectRef <seu-project-ref>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-railway-project.ps1 -Workspace "<seu-workspace>" -Project "<seu-project>" -Environment "production"
```

4. Preencha manualmente os arquivos `.env.local` gerados com suas proprias credenciais.

5. Rode validacoes locais:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Matriz de Variaveis de Ambiente

### restaurante-app

Arquivo local: `restaurante-app/.env.local`

Minimo esperado:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN` (opcional)
- `EXPO_PUBLIC_FIREBASE_*` (se usar Firebase)

### restaurante-web

Arquivo local: `restaurante-web/.env.local`

Minimo esperado:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `PLAYWRIGHT_TEST_EMAIL` e `PLAYWRIGHT_TEST_PASSWORD` para E2E

### restaurante-ops

Arquivo local: `restaurante-ops/.env.local`

Minimo esperado:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente backend)
- `PORT`
- `OPS_ENV`

### restaurante-site

Arquivo local: `restaurante-site/.env.local`

Minimo esperado:

- Variaveis descritas em `restaurante-site/.env.example`

### database-backup

Arquivo local: `database-backup/.env.local`

Minimo esperado:

- `SOURCE_DB_HOST`, `SOURCE_DB_USER`, `SOURCE_DB_PASSWORD`, `SOURCE_DB_NAME`
- `TARGET_DB_HOST`, `TARGET_DB_USER`, `TARGET_DB_PASSWORD`, `TARGET_DB_NAME`

## Implantacao Segura (Railway)

Os scripts de deploy nao usam credenciais hardcoded.

Variaveis obrigatorias para deploy:

- `RAILWAY_WORKSPACE`
- `RAILWAY_PROJECT`
- `RAILWAY_ENVIRONMENT`

### Deploy por servico

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

### Deploy orquestrado (novo)

```bash
bash scripts/open-source/deploy-railway-all.sh
```

No Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/deploy-railway-all.ps1
```

Documentacao dos novos scripts:

- `scripts/open-source/README.md`

Scripts de provisionamento clean:

- `scripts/open-source/setup-preflight-check.sh`
- `scripts/open-source/setup-preflight-check.ps1`
- `scripts/open-source/setup-railway-project.sh`
- `scripts/open-source/setup-railway-project.ps1`
- `scripts/open-source/setup-supabase-project.sh`
- `scripts/open-source/setup-supabase-project.ps1`

## Mobile Build (EAS)

No app mobile:

```bash
cd restaurante-app
bash scripts/deploy-eas.sh
```

Observacoes:

- `eas login` deve ser feito com a conta do mantenedor do fork/projeto.
- Keystore e credenciais de build devem ser configurados no ambiente do usuario.

## Politica de Segredos

- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Nunca publicar tokens de pagamento, webhook ou admin em codigo e docs.
- Nunca manter credenciais em scripts versionados.
- Use gerenciador de segredos da plataforma de deploy.

Checklist rapido antes de abrir PR:

- [ ] Nenhum arquivo `.env` real foi versionado
- [ ] Nenhum token/senha/chave foi adicionado em codigo ou docs
- [ ] `.env.example` atualizado quando variavel nova foi criada
- [ ] README e docs atualizados para novo fluxo tecnico

## Fluxo Recomendado Para Open Source

1. Rodar setup local por templates.
2. Configurar credenciais proprias.
3. Validar build/lint/typecheck.
4. Fazer deploy apenas com variaveis explicitas de ambiente.
5. Executar smoke tests dos fluxos criticos apos deploy.

## Referencias de Documentacao

- `docs/README.md`
- `docs/security/README.md`
- `docs/LGPD/README.md`
- `docs/saas-billing/README.md`
- `docs/repository/DOMAINS.md`

## Observacao Importante Sobre Historico Git

Se este repositorio for publicado publicamente, recomenda-se limpar historico para remover artefatos antigos que possam ter referencias sensiveis e, em seguida, rotacionar credenciais de producao.

## Licenca

Defina a licenca open source do projeto antes da publicacao (ex.: MIT, Apache-2.0 ou GPL-3.0) e inclua arquivo `LICENSE` na raiz.
