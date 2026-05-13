# Open Source Deployment Scripts

This folder contains scripts to bootstrap and deploy the monorepo without exposing credentials.

## Security model

- No script stores real credentials.
- Real secrets must be configured by each user in local env files or provider secret managers.
- Railway deployment scripts require explicit environment variables.

## Files

- `setup-env.sh`: copies `.env.example` to `.env.local` safely.
- `setup-env.ps1`: PowerShell version of the same setup.
- `deploy-railway-all.sh`: orchestrates deploy for ops/web/site.
- `deploy-railway-all.ps1`: PowerShell orchestration.

## Required environment variables for deploy

- `RAILWAY_WORKSPACE`
- `RAILWAY_PROJECT`
- `RAILWAY_ENVIRONMENT`

## Typical usage (Bash)

```bash
bash scripts/open-source/setup-env.sh
# Edit generated .env.local files with your own credentials
export RAILWAY_WORKSPACE="your-workspace"
export RAILWAY_PROJECT="your-project"
export RAILWAY_ENVIRONMENT="production"
bash scripts/open-source/deploy-railway-all.sh
```

## Typical usage (PowerShell)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/setup-env.ps1
# Edit generated .env.local files with your own credentials
$env:RAILWAY_WORKSPACE = "your-workspace"
$env:RAILWAY_PROJECT = "your-project"
$env:RAILWAY_ENVIRONMENT = "production"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-source/deploy-railway-all.ps1
```
