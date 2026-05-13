# Open Source Deployment Scripts

This folder contains scripts to bootstrap and deploy the monorepo without exposing credentials.

## Security model

- No script stores real credentials.
- Real secrets must be configured by each user in local env files or provider secret managers.
- Railway deployment scripts require explicit environment variables.

## Files

- `setup-env.sh`: copies `.env.example` to `.env.local` safely.
- `setup-env.ps1`: PowerShell version of the same setup.
- `setup-preflight-check.sh`: validates tooling/env files/deploy vars.
- `setup-preflight-check.ps1`: PowerShell preflight validation.
- `setup-railway-project.sh`: interactive Railway login/link helper.
- `setup-railway-project.ps1`: PowerShell Railway setup.
- `setup-supabase-project.sh`: Supabase login/link helper, optional migrations.
- `setup-supabase-project.ps1`: PowerShell Supabase setup.
- `deploy-railway-all.sh`: orchestrates deploy for ops/web/site.
- `deploy-railway-all.ps1`: PowerShell orchestration.

## Required environment variables for deploy

- `RAILWAY_WORKSPACE`
- `RAILWAY_PROJECT`
- `RAILWAY_ENVIRONMENT`

## Typical usage (Bash)

```bash
bash scripts/open-source/setup-preflight-check.sh
bash scripts/open-source/setup-env.sh
# Edit generated .env.local files with your own credentials
bash scripts/open-source/setup-supabase-project.sh --project-ref your-project-ref
bash scripts/open-source/setup-railway-project.sh --workspace "your-workspace" --project "your-project" --environment "production"
export RAILWAY_WORKSPACE="your-workspace"
export RAILWAY_PROJECT="your-project"
export RAILWAY_ENVIRONMENT="production"
bash scripts/open-source/deploy-railway-all.sh
```

## Typical usage (PowerShell)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-preflight-check.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-env.ps1
# Edit generated .env.local files with your own credentials
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-supabase-project.ps1 -ProjectRef your-project-ref
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-railway-project.ps1 -Workspace "your-workspace" -Project "your-project" -Environment "production"
$env:RAILWAY_WORKSPACE = "your-workspace"
$env:RAILWAY_PROJECT = "your-project"
$env:RAILWAY_ENVIRONMENT = "production"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/deploy-railway-all.ps1
```
