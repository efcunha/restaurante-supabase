# 🚀 Guia de Deployment — Phase 1 (Validação)

**Data:** 2026-04-16  
**Status:** Post-Modernization Deployment  
**Aplicações:** restaurante-web (Railway) + restaurante-app (Mobile/EAS)

---

## 📋 Arquitetura de Deployment

```
restaurante-supabase/
├── restaurante-web       → Railway (web app em produção)
├── restaurante-app       → EAS Build / Play Store / TestFlight (mobile app)
├── restaurante-ops       → (se aplicável) Railway
└── packages/             → Compartilhados (não faz deploy direto)
```

---

## 🎯 Phase 1: Validação (Semana 1)

### Pré-requisitos

```bash
# 1. Instalar dependências monorepo
pnpm install

# 2. Validar que tudo está limpo
pnpm lint
pnpm typecheck
pnpm storybook:build
```

### Step 1️⃣: Validar Build Local

```bash
# Build all packages (não faz deploy, só valida)
pnpm build

# Resultado esperado: sem erros
# Turborepo cache vai acelerar builds subsequentes
```

### Step 2️⃣: Validar restaurante-web (Railway)

```bash
# 1. Build apenas restaurante-web
cd restaurante-web
pnpm build

# 2. Testar E2E localmente (Playwright)
pnpm test:e2e

# Testes que devem passar:
# ✅ balcao.spec.ts      (Fluxo de balcão)
# ✅ mesa.spec.ts        (Fluxo de mesa)
# ✅ delivery.spec.ts    (Fluxo de delivery)
# ✅ pizza.spec.ts       (Fluxo de pizza)

# 3. Deploy em staging
railway up --service restaurante-web --path-as-root ./restaurante-web

# 4. Validar health check
curl https://staging.restaurante-web.app.br/healthz
# Esperado: HTTP 200 OK

# 5. Validar Storybook disponível
# Acessar: https://staging.restaurante-web.app.br/storybook
```

### Step 3️⃣: Validar restaurante-app (Mobile)

```bash
# ⚠️ restaurante-app NÃO vai para Railway (é mobile)
# Build via script local ou EAS

# Opção A: Build local (Android APK)
cd restaurante-app
./scripts/build-android.sh

# Resultado: APK gerado em android/app/build/outputs/apk/release/
# Validar: app inicia, nenhum erro de import em @restaurante/*

# Opção B: Build via EAS (produção)
cd restaurante-app
eas build --platform android --profile preview

# Resultado: APK gerado no EAS, download disponível
# Deploy posterior: Play Store (manual ou via fastlane)
```

### Step 4️⃣: Validar Parity (app/web)

```bash
# Verificar que ambos apps usam os mesmos componentes compartilhados

# Em restaurante-app/src:
grep -r "@restaurante/ui" . || echo "Nenhuma importação ainda (OK, fase 2)"
grep -r "@restaurante/schemas" . || echo "Nenhuma importação ainda (OK, fase 2)"

# Em restaurante-web/src:
grep -r "@restaurante/ui" . || echo "Nenhuma importação ainda (OK, fase 2)"
grep -r "@restaurante/schemas" . || echo "Nenhuma importação ainda (OK, fase 2)"

# Esperado: Mesmas importações em ambos apps
```

### Step 5️⃣: Medir Bundle Size

```bash
# Comparar antes/depois da modernização
pnpm run build:analyze

# Esperado:
# restaurante-web: ~2.0 MB (sem aumento)
# restaurante-app: ~4.5 MB (sem aumento)

# Se houver aumento > 5%: investigar aliases/imports
```

### Step 6️⃣: Feedback do Time

```bash
# Compartilhar com o time:
# 1. GETTING_STARTED.md (como usar novo monorepo)
# 2. DOCUMENTATION_INDEX.md (índice central)

# Coletar feedback:
# ✅ Aliases @restaurante/* resolvem corretamente?
# ✅ Storybook carrega sem erros?
# ✅ Desenvolvimento local é mais rápido?
# ✅ Git hooks funcionam?
```

---

## ✅ Phase 1 Checklist

- [ ] `pnpm install` sem erros
- [ ] `pnpm build` bem-sucedido
- [ ] `pnpm lint` e `pnpm typecheck` passando
- [ ] E2E tests (restaurante-web) passando em 100%
- [ ] restaurante-web deploy em staging OK
- [ ] restaurante-web health check respondendo
- [ ] restaurante-app build (local ou EAS) OK
- [ ] restaurante-app sem erros de import em @restaurante/\*
- [ ] Bundle size sem regressão > 5%
- [ ] Team feedback coletado
- [ ] Documentação compartilhada e lida

**Gate para Phase 2:** Todos os itens acima ✅

---

## 🚨 Troubleshooting Deployment

### restaurante-web falha no Railway

```bash
# 1. Verificar que aliases estão em tsconfig.json
cat restaurante-web/tsconfig.json | grep "@restaurante"

# 2. Verificar que package.json tem deps corretas
cat restaurante-web/package.json | grep "@restaurante"

# 3. Testar build local
cd restaurante-web && pnpm build

# 4. Verificar Railway logs
railway logs --service restaurante-web --tail

# Comum: Path aliases não resolvidas em build time
# Solução: Verificar que babel-plugin-module-resolver está em babel.config.js
```

### restaurante-app build falha

```bash
# 1. Verificar Android SDK
echo $ANDROID_HOME
# Esperado: /path/to/Android/Sdk

# 2. Verificar que aliases estão em babel.config.js
cat restaurante-app/babel.config.js

# 3. Rodar build com verbose
cd restaurante-app && ./scripts/build-android.sh --verbose

# Comum: @restaurante/* não resolvido no runtime
# Solução: Reiniciar Metro e pnpm install
```

### E2E tests falhando

```bash
# 1. Verificar que Playwright está instalado
pnpm list @playwright/test

# 2. Rodar tests com debug
cd restaurante-web && pnpm test:e2e --debug

# 3. Verificar que app está rodando em localhost:3000
pnpm dev

# Comum: App não iniciou ou porta já está em uso
# Solução: Matar processos na porta 3000, reiniciar
```

---

## 📊 Métricas a Monitorar

### Performance

| Métrica                      | Esperado | Ferramentas          |
| ---------------------------- | -------- | -------------------- |
| Build time (restaurante-web) | <5min    | Railway logs         |
| Build time (restaurante-app) | <15min   | EAS console          |
| Bundle size (web)            | 2.0 MB   | `pnpm build:analyze` |
| Bundle size (app)            | 4.5 MB   | APK size             |
| TypeScript check             | <30s     | `pnpm typecheck`     |
| Lint check                   | <20s     | `pnpm lint`          |

### Confiabilidade

| Métrica          | Esperado | Ferramentas       |
| ---------------- | -------- | ----------------- |
| E2E tests pass   | 100%     | Playwright        |
| Web health check | HTTP 200 | curl/Datadog      |
| App startup time | <3s      | APK profiling     |
| Type safety      | 0 errors | TypeScript strict |

### Escalabilidade

| Métrica              | Esperado           | Ferramentas                 |
| -------------------- | ------------------ | --------------------------- |
| Turborepo cache hits | >50% após 2ª build | `turbo run build --profile` |
| pnpm install time    | <2min              | `time pnpm install`         |
| Monorepo complexity  | Low coupling       | depcheck / madge            |

---

## 🔄 Phase 2: Migração Incremental (Semana 2-4)

Após Phase 1 passar:

```bash
# 1. Selecionar 3-5 componentes para migrar
# Exemplo: Button, Input, Card

# 2. Migrar para packages/ui
# Copiar restaurante-app/src/ui/Button.tsx → packages/ui/src/components/Button.tsx

# 3. Atualizar imports
# OLD: import Button from '@/ui/Button'
# NEW: import { Button } from '@restaurante/ui'

# 4. Validar em ambos apps
# ✅ restaurante-app: import { Button } from '@restaurante/ui' funciona
# ✅ restaurante-web: import { Button } from '@restaurante/ui' funciona

# 5. PR review + merge
```

---

## 🔐 Security Checklist

- [ ] Nenhuma secret hardcoded em repositório
- [ ] `.env.example` documenta todas as variáveis
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado (restaurante-ops)
- [ ] RLS policies validadas (Supabase)
- [ ] Secrets não aparecem em logs

---

## 📞 Contatos & Escalação

| Problema           | Contato    | Referência                      |
| ------------------ | ---------- | ------------------------------- |
| Deployment Railway | DevOps     | `railway --help`                |
| EAS Build issues   | Mobile Dev | `eas --help`                    |
| TypeScript errors  | Tech Lead  | `MONOREPO_MODERNIZATION.md`     |
| E2E test failures  | QA         | `restaurante-web/e2e/*.spec.ts` |
| Performance issues | Architect  | `ARCHITECTURE_DECISIONS.md`     |

---

## ✨ Success Criteria

🟢 **Phase 1 Passed** quando:

- ✅ Web app roda sem erros em Railway staging
- ✅ Mobile app compila sem erros (local ou EAS)
- ✅ Todos E2E tests passam
- ✅ Bundle size mantém-se estável
- ✅ Time confirmou que novo monorepo funciona

---

**Próximo passo:** Phase 2 — Component Migration  
**Documentação:** Ver `NEXT_STEPS.md` para roadmap completo
