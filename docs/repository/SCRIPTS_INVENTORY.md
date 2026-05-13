# Scripts Inventory

Inventário estrutural dos scripts do monorepo após a reorganização de documentação e utilitários.

## 1. Scripts organizados por domínio

### Monorepo

- `scripts/security/`
  - `check-cve-status.ps1`
  - `cve-patch-report.ps1`
- `scripts/utils/`
  - `check_chars.js`
- `scripts/form-automation/`
  - `semi-auto-form-flow.mjs`
  - `__tests__/semi-auto-form-flow.test.mjs`

### Backup / Supabase / Billing functions

- `database-backup/`
  - `backup.sh`
  - `restore.sh`
  - `check-migration-sync.sh`
  - equivalentes `.bat`
- `database-backup/supabase/functions/scripts/`
  - smoke, webhook, audit e verify-all de billing

### Projetos

- `restaurante-app/scripts/`: build, deploy EAS, assets, debug, seeds, phase12
- `restaurante-web/scripts/`: deploy e phase12
- `restaurante-ops/scripts/`: deploy, inspeção e rate-limit smoke

## 2. Scripts referenciados e existentes

### `restaurante-ops/package.json`

Referências consistentes encontradas:
- `scripts/rate-limit-smoke.sh`
- `scripts/rate-limit-smoke.ps1`

### `restaurante-web/package.json`

Referências consistentes encontradas:
- `scripts/deploy-railway.sh`
- `scripts/phase12-profile.js`

### `restaurante-app/package.json`

Referências consistentes encontradas:
- `scripts/phase12-profile.js`
- `scripts/deploy-eas.sh`
- `scripts/fix-icon-padding.js`
- `scripts/generate-android-icons.js`
- `scripts/update-splash-screen.js`

Comandos de deploy EAS no app:
- `deploy:eas` (padrão: android + ios)
- `deploy:eas:android`
- `deploy:eas:ios`

## 3. Inconsistências encontradas

As referências quebradas identificadas em `restaurante-app/package.json` e `restaurante-web/package.json`
foram removidas na limpeza de manutenção de 25/03/2026.

Estado atual:
- `restaurante-app/package.json` mantém apenas scripts com arquivo correspondente no projeto.
- `restaurante-web/package.json` mantém apenas scripts válidos para o contexto web.
- Os aliases `update-icon` e `update-all-icons` permanecem no web apenas como no-op explícito,
  indicando que a automação real de ícones/splash existe somente em `restaurante-app/`.

## 4. Fluxo semi-automatico de formularios (novo)

Script principal:
- `scripts/form-automation/semi-auto-form-flow.mjs`

Entradas de referencia:
- `docs/forms/requests/change-request.example.json`
- `docs/forms/requests/approval.example.json`

Saidas de evidencias em `tmp/form-automation/`:
- `form-change-summary.json`
- `target-resolution.json`
- `form-change-report.md`
- `proposed-diffs/*.diff`
- `security-gate.md`
- `validation-results.json`
- `pr-description-draft.md`
- `approval-audit.json`
- `pending-approvals.md`

Regras operacionais:
- `--strict-targets` falha quando formulario nao resolve alvo
- `--apply` com gate pendente encerra com exit code `2`
- Em apply auditavel, `approval-file` exige `approver` e `approvedAt` (ISO)

Runbook:
- `docs/repository/FORM_AUTOMATION_SEMI_AUTO_RUNBOOK.md`

## 5. Scripts legados / manuais

- `scripts/utils/check_chars.js`

Observação:
- depende de caminho de arquivo antigo e deve ser tratado como utilitário manual/legado, não como script operacional suportado.

## 6. Recomendação de manutenção

1. Não renomear scripts de deploy/smoke de produção sem avaliar automações e hábitos operacionais.
2. Ao adicionar novo script em `package.json`, garantir o arquivo correspondente no mesmo PR.
3. Manter scripts globais do monorepo em `scripts/<dominio>/`.
4. Manter smoke e utilitários de billing no diretório `database-backup/supabase/functions/scripts/`.