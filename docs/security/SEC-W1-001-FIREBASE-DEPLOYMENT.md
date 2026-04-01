# SEC-W1-001: Firebase API Key Rotation - Deployment Runbook

**Item:** SEC-W1-001 (Rotacionar Firebase API Key)  
**Status:** 🟡 DECISAO PENDENTE (gate de runtime/deprecacao)  
**Data de Conclusão:** 01/04/2026  
**Aplica-se:** `restaurante-app`, `restaurante-web`

---

## 🔐 Situação Atual

**Chave Antiga Revogada:**
- ✅ Revogada em: 01/04/2026
- ✅ Status no Firebase: Desabilitada

**Placeholders Saneados:**
- ✅ `restaurante-app/.env.example`: `EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here`
- ✅ `restaurante-web/.env.example`: Idem

**Próximo Passo:**
- Gerar NOVA chave no Firebase Console
- Configurar em ambientes (app mobile via EAS/Expo env, web via Railway)
- Testar funcionamento em controlled smoke

### Nota de Escopo (Supabase vs Firebase)

Mesmo com Supabase como backend principal, o repositório ainda possui dependencias ativas de Firebase em servicos legados (ex.: `PaginationService`, `PaymentValidationService`, `UnifiedQueryService`, `QueryOptimizerService`, `MigrationEngine`).

Enquanto esses imports existirem, `EXPO_PUBLIC_FIREBASE_API_KEY` permanece relevante para evitar quebra em caminhos que ainda inicializam Firebase via `src/config/firebaseConfig.ts`.

Gate de decisao (01/04/2026):
- Avaliacao de runtime indica que esses caminhos estao legados/dormentes no fluxo ativo (sem imports fora de `src/services`).
- Ver assessment: `docs/security/SEC-W1-001-FIREBASE-RUNTIME-ASSESSMENT-2026-04-01.md`.
- Acao recomendada: fechar gate de deprecacao antes de tratar rotacao como obrigatoria imediata.

---

## 🔑 Gerar Nova Chave (Firebase Console)

```bash
# 1. Acessar Firebase Console
# URL: https://console.firebase.google.com/project/restaurante-6f221/settings/general

# 2. Em "Your apps" → Web App (restaurante-6f221)

# 3. Copiar apiKey do config (exemplo abaixo - NÃO USAR ESTE):
# ❌ ANTIGO (revogado):
#    AIzaSyAKbTm0iFFNwAcSmTtLrlyIHKc1ds1LrDE

# 4. Gerar Nova Chave (Create API Key):
# - Navigate: Project Settings → Service Accounts → API Keys
# - Clique: "Create API Key"
# - Copie a chave gerada (parecida com AIzaSy... de 39 caracteres)

# 5. Revogou chave antiga? SIM ✅ (em passo anterior)
```

---

## 🚀 Deploy em 3 Passos

### Passo 1: Local Development

```bash
# Arquivo: restaurante-app/.env (não tracked, local apenas)
EXPO_PUBLIC_FIREBASE_API_KEY=<NOVA_CHAVE_AQUI>

# Arquivo: restaurante-web/.env (não tracked, local apenas)
EXPO_PUBLIC_FIREBASE_API_KEY=<NOVA_CHAVE_AQUI>

# Testar localmente
npm run dev  # ou eas build
```

### Passo 2: Configurar Ambientes de Produção

#### App Mobile (`restaurante-app`) - EAS/Expo env

1. Abrir Expo/EAS project do app.
2. Definir `EXPO_PUBLIC_FIREBASE_API_KEY` no ambiente de build (preview/production).
3. Gerar novo build EAS do app para embutir a variavel.

Observacao:
- `restaurante-app` e mobile (Expo/EAS), nao deployado como servico Railway.

#### Web (`restaurante-web`) - Railway

##### Via Railway CLI

```bash
# Renovar token se necessário
railway login

# Para restaurante-web
railway link  # escolher restaurante-web
railway variables set EXPO_PUBLIC_FIREBASE_API_KEY=<NOVA_CHAVE>
railway variables list | grep FIREBASE_API_KEY
railway up --service restaurante-web --path-as-root ./restaurante-web
```

##### Via Railway UI (Se CLI falhar)

1. Dashboard: https://railway.app/dashboard
2. Projeto: `restaurante-supabase`
3. Serviço: `restaurante-web`
4. Aba: "Variables"
5. Add: `EXPO_PUBLIC_FIREBASE_API_KEY` = `<NOVA_CHAVE>`
6. Save → Redeploy automático

### Passo 3: Validar Smoke

```bash
# 1. Testar Login Firebase (AuthContext)
# - Fazer login com credenciais conhecidas
# - Verificar que auth.onAuthStateChanged dispara corretamente
# - Conferir no Sentry: nenhum erro de "API_KEY_INVALID" ou "MISSING_API_KEY"

# 2. Testar Firestore (se usado)
# - Navegar para tela que lê Firestore
# - Verificar que queries funcionam
# - Conferir no Sentry: sem erros de "Permission denied"

# 3. Testar Analytics (se usado)
# - Verificar que eventos estão sendo gravados
# - Firebase Console → Analytics → verificar eventos recentes

# 4. Verificar Logs do Railway
# - Procurar por erros de "firebase.auth" ou "INVALID_API_KEY"
# - Não deve haver warnings de chave faltante
```

---

## 📋 Checklist

- [ ] Nova chave gerada no Firebase Console
- [ ] Chave antiga revogada
- [ ] `.env.example` usa placeholder (já ✅)
- [ ] Testado em local dev (`.env`)
- [ ] Configurado no app mobile (`restaurante-app`) via EAS/Expo env
- [ ] Configurado em Railway (`restaurante-web`)
- [ ] Logs verificados em Sentry (sem erros de API key)
- [ ] Smoke test de login passou
- [ ] Feature flags funcionando (se aplicável)

### Bloco de Encerramento (preencher apos deploy)

- Data/hora da aplicacao: PREENCHER
- Variavel aplicada em `restaurante-app` (EAS/Expo env): `EXPO_PUBLIC_FIREBASE_API_KEY` = (nao registrar valor)
- Variavel aplicada em `restaurante-web`: `EXPO_PUBLIC_FIREBASE_API_KEY` = (nao registrar valor)
- Resultado smoke login: PREENCHER
- Resultado smoke Firebase/Firestore: PREENCHER
- Resultado Sentry (sem `API_KEY_INVALID`): PREENCHER
- Decisao final do item: `concluido` ou `pendente`

---

## 🔎 Evidência de Validação Recente (2026-04-01 18:31:28 UTC)

Varredura de repositório (app/web) para chave Firebase hardcoded executada com fallback `grep`:

- Encontrado apenas placeholder esperado em exemplos de ambiente:
	- `restaurante-app/.env.example` -> `EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here`
	- `restaurante-web/.env.example` -> `EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here`
	- `restaurante-app/.env.staging` e `restaurante-web/.env.staging` -> `your-staging-api-key` (placeholder)
- Nao encontrado valor real de API key com padrao `AIza...` em codigo fonte de producao.

---

## 🔄 Rollback (Emergencial)

Se a nova chave causar issues:

```bash
# App mobile: reverter variavel no EAS/Expo env e gerar novo build

# Web via Railway UI
# 1. Dashboard → restaurante-web → Variables
# 2. EXPO_PUBLIC_FIREBASE_API_KEY: reverter para chave anterior (se ainda válida)
# 3. Save → Redeploy

# OU via CLI
railway variables set EXPO_PUBLIC_FIREBASE_API_KEY=<CHAVE_ANTERIOR>
railway up --service restaurante-web --path-as-root ./restaurante-web
```

**Nota:** Se chave anterior foi revogada, será necessário:
1. Gerar SEGUNDA nova chave rapidamente no Firebase
2. Ou reverter código para versão anterior (feature flag)

---

## 🔗 Referências

- Plan: [SECURITY_REMEDIATION_PLAN_2026-Q2.md](./SECURITY_REMEDIATION_PLAN_2026-Q2.md) → SEC-W1-001
- Firebase Console: https://console.firebase.google.com/project/restaurante-6f221/settings/general
- Railway Dashboard: https://railway.app/dashboard

---

**Status:** 🟡 DECISAO PENDENTE (gate de runtime/deprecacao)  
**Bloqueador:** Railway CLI sem auth valida no momento (`railway whoami` => `Unauthorized` em 01/04/2026, 17:10 UTC), impactando apenas `restaurante-web` no Railway.  
**Esforço:** ~15 minutos deploy web + ~10 minutos teste (mais ciclo de build EAS no app)
