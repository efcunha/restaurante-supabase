# Storybook Operations & Smoke Testing Guide

**Version:** 1.0  
**Last Updated:** 2026-04-15  
**Status:** ✅ Production

---

## 📋 Overview

This guide documents the operational setup for:
- **Public Storybook instance** (versioned Railway deployment)
- **Smoke testing infrastructure** (automated health checks)
- **Figma integration** (node map & docs URL consistency)
- **Basic Auth protection** (secure access to public UI documentation)

### Form Preview Policy (2026-04-15)

- Storybook is the real visual source for restaurant-web form layout reviews.
- Figma remains a technical support artifact (node map, references, redesign input), not a faithful form preview source.
- Real-form previews are published via composition stories in `restaurante-web/src/screens/storybook/FormRealPreviews.stories.tsx`.
- Current coverage is **29/29** forms from `restaurante-web/src/ui/formsCatalogData.ts` in the group `Forms/RestauranteWeb/RealPreviews`.

Coverage verification (local):

```bash
cd restaurante-web
npm run storybook:build -- --disable-telemetry

node -e "const fs=require('fs'); const idx=JSON.parse(fs.readFileSync('storybook-static/index.json','utf8')); const entries=Object.values(idx.entries||{}); const real=entries.filter(e=>e.title==='Forms/RestauranteWeb/RealPreviews'&&e.type==='story'); console.log('real previews:', real.length);"
```

Rastreabilidade formulario -> story id:
- `docs/design-system/FORM_PREVIEW_MATRIX_RESTAURANTE_WEB.md`

---

## 🏗️ Architecture

### Components

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| **Storybook Build** | `restaurante-web/` | Static site generation (~build time) | ✅ Auto-triggered |
| **Deploy Service** | `restaurante-web-storybook/` | Dedicated Railway service for hosting | ✅ Production |
| **Health Endpoint** | `/healthz-internal` | Railway health probe (auth-bypass) | ✅ Configured |
| **Smoke Script** | `docs/design-system/smoke-storybook-public.mjs` | URL validation + node map consistency | ✅ Production |
| **Smoke Workflow** | `.github/workflows/storybook-public-smoke.yml` | Scheduled (every 6h) + manual trigger | ✅ Active |
| **Figma Node Map** | `docs/design-system/figma-node-map.generated.json` | Component → Figma node reference | ✅ 116 entries |

### Data Flow

```
restaurante-web
  ├─ Build Storybook (npm run build:storybook)
  ├─ Generate figma-node-map.json
  └─ Publish to Railway

restaurante-web-storybook (Railway)
  ├─ server.mjs (Node HTTP server)
  ├─ storybook-static/ (build artifacts)
  ├─ /healthz-internal (health probe, no auth)
  ├─ / (Storybook UI, optional Basic Auth)
  └─ Reverse proxy TLS at Railway ingress

Smoke Tests (GitHub Actions / Local)
  ├─ Check public URL reachability
  ├─ Validate Basic Auth handling
  ├─ Verify figma-node-map consistency
  └─ Report status (pass/fail with context)
```

---

## 🚀 Deployment Workflow

### Building Storybook Locally

```bash
cd restaurante-web

# Build Storybook static site
npm run build:storybook

# This creates:
# - storybook-static/
# - docs/design-system/figma-node-map.generated.json
```

### Deploying to Railway

**Via dedicated deploy script (recommended):**

```bash
# From repo root
cd restaurante-web/scripts
./deploy-storybook-railway.sh
```

**Options:**
```bash
./deploy-storybook-railway.sh --skip-build     # Use existing storybook-static/
./deploy-storybook-railway.sh --prepare-only   # Build + stage, don't publish
./deploy-storybook-railway.sh --help           # Show usage
```

**What the script does:**
1. Copies `restaurante-web/storybook-static/` → `restaurante-web-storybook/storybook-static/`
2. Updates `restaurante-web-storybook/deploy-metadata.json` with timestamp/commit info
3. Runs `railway up --service restaurante-web-storybook --path-as-root ./restaurante-web-storybook`

**Manual deployment (if script fails):**

```bash
# From repo root
cd restaurante-web-storybook
cp -r ../restaurante-web/storybook-static .
railway up --service restaurante-web-storybook --path-as-root .
```

### Verifying Deployment

After deploy completes, run smoke test:

```bash
node docs/design-system/smoke-storybook-public.mjs
```

Ou, para um probe rapido de producao (root + health):

```bash
cd restaurante-web
npm run storybook:verify:prod
```

**Expected output:**
```
[storybook-smoke] URL publica protegida por Basic Auth (401) sem credenciais configuradas; endpoint acessivel e protegido.
[storybook-smoke] node map OK: 116 entradas usando https://...
[storybook-smoke] smoke concluido com sucesso.
```

**Quick production probes (manual):**

```bash
# Root should return 401 when Basic Auth is enabled
curl -I https://restaurante-web-storybook-production.up.railway.app/

# Health endpoint must always return 200 (auth bypass)
curl -i https://restaurante-web-storybook-production.up.railway.app/healthz-internal
```

---

## 🛡️ Basic Auth Setup

### Configuration

Basic Auth is **optional** and managed via environment variables on the Railway service:

| Env Variable | Purpose | Example |
|--------------|---------|---------|
| `STORYBOOK_BASIC_AUTH_USER` | Username | `storybook-viewer` |
| `STORYBOOK_BASIC_AUTH_PASS` | Password | `super-secret-pass` |

**To enable:**
1. In Railway dashboard, open `restaurante-web-storybook` service → Variables
2. Add `STORYBOOK_BASIC_AUTH_USER` and `STORYBOOK_BASIC_AUTH_PASS`
3. Deployment auto-restarts
4. Test: `curl -u username:password https://restaurante-web-storybook-production.up.railway.app`

**To disable:**
1. Delete both env variables
2. Service becomes publicly accessible (recommended for dev/staging only)

### Auth Behavior

| Scenario | Endpoint | Response |
|----------|----------|----------|
| No auth configured | `/` | 🟢 200 (public) |
| Auth configured, no credentials | `/` | 🟡 401 + `www-authenticate` header |
| Auth configured, valid credentials | `/` | 🟢 200 |
| Auth configured, invalid credentials | `/` | 🔴 401 |
| Any auth state | `/healthz-internal` | 🟢 200 (health probe bypass) |

---

## 🔍 Smoke Testing

### What Gets Tested

1. **URL Reachability:**
   - Base URL responds with 200 or 401 (expected protected states)
   - TLS/HTTPS working correctly
   - No network errors

2. **Basic Auth Validation:**
   - 401 without credentials when protected (✅ pass)
   - 401 with credentials when they're invalid (❌ fail)
   - 200 with valid credentials (✅ pass)

3. **Figma Node Map Consistency:**
   - All 116 entries have `docsUrl` pointing to expected base
   - No stale/outdated references
   - Figures match reality

### Running Smoke Locally

#### With Default Settings (Expects Protected Public Endpoint)

```bash
node docs/design-system/smoke-storybook-public.mjs
```

**Output (with Basic Auth enabled):**
```
[storybook-smoke] URL publica protegida por Basic Auth (401) sem credenciais configuradas; endpoint acessivel e protegido.
[storybook-smoke] node map OK: 116 entradas usando https://restaurante-web-storybook-production.up.railway.app
[storybook-smoke] smoke concluido com sucesso.
```

#### With Auth Credentials (Testing Valid Auth)

```bash
export STORYBOOK_PUBLIC_BASIC_AUTH_USER="storybook-viewer"
export STORYBOOK_PUBLIC_BASIC_AUTH_PASS="super-secret-pass"
node docs/design-system/smoke-storybook-public.mjs
```

**Output (with valid credentials):**
```
[storybook-smoke] URL publica OK: https://restaurante-web-storybook-production.up.railway.app (200)
[storybook-smoke] node map OK: 116 entradas usando https://...
[storybook-smoke] smoke concluido com sucesso.
```

#### Strict Auth Mode (Fail on 401 Without Credentials)

```bash
export STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH="true"
node docs/design-system/smoke-storybook-public.mjs
```

**Behavior:**
- If endpoint returns 401 and no credentials provided → ❌ **FAIL**
- Useful for CI/CD to enforce that credentials are always passed or auth is disabled

### Running Smoke in GitHub Actions

**Scheduled (every 6 hours):**  
Workflow: `.github/workflows/storybook-public-smoke.yml`

**Manual trigger:**
```bash
gh workflow run storybook-public-smoke.yml
```

**Environment variables for GHA:**
- `STORYBOOK_PUBLIC_BASE_URL` – override Storybook URL (default: production)
- `STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH` – enable strict auth mode (optional)
- ❌ `STORYBOOK_PUBLIC_BASIC_AUTH_USER/PASS` – NOT passed to workflow (intentional; requires manual auth test)

**Job Summary output:**
- The workflow writes a `Quick Incident Checklist` in `GITHUB_STEP_SUMMARY` with direct commands for smoke, node map validation, Railway logs and controlled redeploy.
- Use this summary as the first triage step before opening a broader incident analysis.

---

## 🐛 Troubleshooting

### Smoke Test Fails: "URL publica respondeu status nao esperado: 503"

**Cause:** Railway service crashed or is restarting.

**Fix:**
```bash
# 1. Check service status
railway service ls

# 2. Check logs
railway logs --service restaurante-web-storybook -n 50

# 3. Restart service
railway up --service restaurante-web-storybook --path-as-root ./restaurante-web-storybook
```

### Smoke Test Fails: "node map OK: 0 entradas"

**Cause:** `figma-node-map.generated.json` is empty or corrupted.

**Fix:**
```bash
# 1. Rebuild Storybook locally
cd restaurante-web
npm run build:storybook

# 2. Verify node map was generated
cat docs/design-system/figma-node-map.generated.json | head

# 3. Re-deploy
cd ../restaurante-web/scripts
./deploy-storybook-railway.sh
```

### Smoke Test Fails: "URL publica protegida... com modo estrito ativo"

**Cause:** `STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH=true` but no credentials passed.

**Fix:**
- Option 1: Disable strict mode: `unset STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH`
- Option 2: Provide credentials: `export STORYBOOK_PUBLIC_BASIC_AUTH_USER=...`
- Option 3: Disable Basic Auth on service (if not needed): remove env vars from Railway

### Health Check Fails (Railway reports service unhealthy)

**Cause:** `/healthz-internal` not responding or not configured correctly.

**Fix:**
```bash
# 1. Verify endpoint directly
curl -v https://restaurante-web-storybook-production.up.railway.app/healthz-internal

# 2. Check Railway healthcheck config (should be):
railway service env RAILWAY_SERVICE_STORYBOOK get

# Should show:
# PORT=8080
# STORYBOOK_STATIC_DIR=storybook-static

# 3. Verify railway.json healthcheck path
cat restaurante-web-storybook/railway.json | grep healthcheck

# Should show:
# "healthcheckPath": "/healthz-internal"

# 4. Check server.mjs has the endpoint
grep -A 5 "'/healthz-internal'" restaurante-web-storybook/server.mjs
```

### "Cannot find native module 'ExpoFontLoader'" Error in Storybook

**Cause:** React Native Expo modules imported in story. Storybook webpack can't resolve native modules.

**Status:** ✅ **Already fixed** via `src/storybook-mocks/expo-modules-core.js` alias in `.storybook/main.ts`

**If error recurs:**
- Check `.storybook/main.ts` has alias: `'expo-modules-core': path.resolve(__dirname, '../src/storybook-mocks/expo-modules-core.js')`
- If missing, re-add it and rebuild: `npm run build:storybook`

---

## 📊 Monitoring & Alerts

### Dashboard Links

| Service | Link | Purpose |
|---------|------|---------|
| **Storybook** | https://restaurante-web-storybook-production.up.railway.app | Public UI |
| **Railway Service** | https://railway.app/project/... | Deployment logs, metrics, restarts |
| **GitHub Workflow** | https://github.com/restaurante-supabase/.../actions/workflows/storybook-public-smoke.yml | Test runs history |

### Key Metrics

- **Build time:** 2-4 minutes (npm run build:storybook)
- **Deploy time:** 1-2 minutes (railway up)
- **Smoke test runtime:** <5 seconds
- **Node map entries:** 116 (should remain stable; increased only on UI component additions)

### Manual Health Check Frequency

| Environment | Frequency | Trigger |
|-------------|-----------|---------|
| **Production** | Every 6 hours (GHA workflow) | Automated by cron / Manual trigger |
| **Development** | On deployment | After running deploy script |
| **Pre-production** | Per release cycle | Before merge to main |

---

## 🔐 Security Notes

### No Secrets in Smoke Tests

- ✅ Smoke script reads auth from env vars only
- ✅ GitHub Actions workflow does NOT pass credentials (intentional)
- ❌ Never hardcode credentials in `.mjs` or workflows
- ✅ For strict auth testing in CI, use a separate secrets management flow (e.g., Railway deployment-specific secrets)

### TLS Termination

- Railway ingress handles TLS → server.mjs receives plain HTTP
- ✅ Marked as expected in server.mjs: `import http from 'node:http'; // nosnyk`
- Snyk may flag `node:http` usage (false positive; TLS is handled upstream)

### Health Endpoint Bypass

- `/healthz-internal` intentionally **bypasses** Basic Auth
- ✅ Used by Railway health probe only (not user-facing)
- ✅ Secure: health endpoint returns minimal info (just `{ status: 'ok' }`)
- ✅ NOT exploitable for accessing Storybook UI

---

## 📝 Maintenance Tasks

### Weekly

- [ ] Check GitHub Actions smoke test run (any failures?)
- [ ] Manual smoke test locally after any UI component changes

### Monthly

- [ ] Review Railway logs for any error spikes
- [ ] Rebuild Storybook locally**: `npm run build:storybook` (validates no build regression)
- [ ] Verify Figma node map entry count (should be stable; alert if delta >10%)

### On Every UI Component Addition

- [ ] Ensure `.stories.tsx` and Figma node-id are present
- [ ] Rebuild Storybook locally
- [ ] Verify figma-node-map.generated.json includes new entry
- [ ] Run smoke test locally

### Quarterly

- [ ] Review Snyk findings (`snyk code test restaurante-web/src/ui`)
- [ ] Update dependencies in `restaurante-web-storybook/package.json` (if needed)
- [ ] Audit Basic Auth credentials (rotate if in production)

---

## 🔗 Related Documentation

- [Design System Overview](./README.md)
- [Figma Integration](./figma-integration.md)
- [Smoke Test Script Source](./smoke-storybook-public.mjs)
- [Railway Deployment Config](../../restaurante-web-storybook/railway.json)
- [GitHub Actions Workflow](../../.github/workflows/storybook-public-smoke.yml)

---

## 📞 Support & Questions

**Issue:** Storybook build fails locally  
**Debug:** `cd restaurante-web && npm run build:storybook --verbose`

**Issue:** Deploy script fails  
**Debug:** Check Railway CLI: `railway whoami` + `railway project current`

**Issue:** Smoke test times out  
**Debug:** Check network connectivity + Railway service status

**Escalation:** Contact platform/infrastructure team if Railway service is unresponsive

---

**End of Guide**  
For updates, see `.github/skills/restaurante-supabase/SKILL.md` (project skill reference).
