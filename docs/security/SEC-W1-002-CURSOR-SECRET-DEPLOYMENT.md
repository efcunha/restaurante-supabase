# SEC-W1-002: Cursor Secret Configuration - Deployment Runbook

**Item:** SEC-W1-002 (Remover Cursor Secret Hardcoded)  
**Status:** Pronto para Deploy  
**Data de Conclusão do Código:** 01/04/2026  
**Deploy do Secret:** Pendente

---

## 🔐 Secret Gerado

```
CURSOR_SECRET=9f05e59a28393b3c7684abf8f98d9d226a1a47ea1383ba7c74b04be89d868fd6
```

**Gerado com:** `openssl rand -hex 32` (64 caracteres hex)  
**Data:** 01/04/2026 16:15 UTC  
**Tipo:** Cursor pagination signature secret  
**Validade:** Permanente (mude se comprometido)

---

## ✅ Validação de Código

**Status:** CONCLUÍDO

### Arquivos Auditados

| Arquivo | Status | Detalhes |
|---------|--------|----------|
| `restaurante-app/src/utils/cursorValidation.ts` | ✅ Seguro | `resolveCursorSecret()` implementado; exigir env var em prod; fallback efêmero em dev |
| `restaurante-app/src/services/optimization/CursorPaginationService.ts` | ✅ Seguro | Mesmo padrão; sem fallback hardcoded |
| `restaurante-web/src/utils/cursorValidation.ts` | ✅ Seguro | Idem |
| `restaurante-web/src/services/optimization/CursorPaginationService.ts` | ✅ Seguro | Idem |
| `restaurante-app/.env.example` | ✅ Saneado | `CURSOR_SECRET=generate_with_openssl_rand_hex_32` (placeholder) |
| `restaurante-web/.env.example` | ✅ Saneado | Idem |

**Validação de Código:** ✅ Nenhum hardcode de `default-cursor-secret` ou `cursor-secret-key` encontrado  
**Banco de Dados:** ✅ Lógica de validação NOT dependente de credentials persistidas  
**Build:** ✅ Compila sem erros com ts-node no contexto de dev (sem CURSOR_SECRET)

---

## 🚀 Como Fazer Deploy do Secret

### App Mobile (`restaurante-app`) - EAS/Expo env

1. Definir `CURSOR_SECRET` no ambiente de build do app no Expo/EAS.
2. Gerar novo build EAS para embutir a variavel no app mobile.

Observacao:
- `restaurante-app` e mobile (Expo/EAS), nao deployado como servico Railway.

### Web (`restaurante-web`) - Railway

#### Via Railway CLI (Recomendado)

```bash
# 1. Renovar autenticação Railway (se token expirado)
railway login

# 2. Apontar para restaurante-web
railway link  # escolher restaurante-web

# 3. Configurar CURSOR_SECRET
railway variables set CURSOR_SECRET=9f05e59a28393b3c7684abf8f98d9d226a1a47ea1383ba7c74b04be89d868fd6

# 4. Verificar que foi definido
railway variables list | grep CURSOR_SECRET

# 5. Redeploy
railway up --service restaurante-web --path-as-root ./restaurante-web
```

#### Via Railway UI (Se CLI Falhar)

1. Navigate para https://railway.app/dashboard
2. Abra projeto `restaurante-supabase`
3. Abra serviço `restaurante-web`
4. Abra aba "Variables"
5. Clique "+ Add Variable"
6. Nome: `CURSOR_SECRET`
7. Valor: `9f05e59a28393b3c7684abf8f98d9d226a1a47ea1383ba7c74b04be89d868fd6`
8. Clique "Save"
9. Aguarde redeploy automático

### Validação Pós-Deploy

```bash
# 1. Verificar que app/web estão rodando
# Acessar: restaurante-app (web preview ou build nativo)
# Verificar que não há erro de "CURSOR_SECRET not configured"

# 2. Testar paginação simples
# Em app: navegar para cardápio ou lista de comanda
# Em web: navegar para qualquer tabela paginada

# 3. Verificar logs do Railway
# Procurar por erros de `[CursorValidator]` ou `[CursorPaginationService]`
# Não deve haver warnig de "CURSOR_SECRET not configured"
```

---

## 📋 Checklist Final

- [ ] Secret gerado via `openssl rand -hex 32`
- [ ] Código auditado sem hardcodes (ambos app e web)
- [ ] `.env.example` com placeholder correto
- [ ] Secret enviado para **restaurante-app** via EAS/Expo env
- [ ] Secret enviado para **restaurante-web** via Railway (CLI ou UI)
- [ ] Build EAS novo do app gerado com `CURSOR_SECRET`
- [ ] Build/redeploy do web completado no Railway
- [ ] Logs verificados (sem erro de secret faltante)
- [ ] Paginação testada em pelo menos um endpoint em ambas as apps
- [ ] Evidência registrada neste documento e no status semanal

### Bloco de Encerramento (preencher apos deploy)

- Data/hora da aplicacao: PREENCHER
- Variavel aplicada em `restaurante-app` (EAS/Expo env): `CURSOR_SECRET` = (nao registrar valor)
- Variavel aplicada em `restaurante-web`: `CURSOR_SECRET` = (nao registrar valor)
- Resultado smoke de paginacao no app: PREENCHER
- Resultado smoke de paginacao na web: PREENCHER
- Resultado logs Railway (sem `CURSOR_SECRET not configured`): PREENCHER
- Decisao final do item: `concluido` ou `pendente`

---

## 🔎 Evidência de Validação Recente (2026-04-01 18:31:28 UTC)

Varredura de repositório (app/web) para hardcode de cursor secret executada com fallback `grep`:

- Nao encontrado `default-cursor-secret` ou `cursor-secret-key`.
- Nao encontrado `CURSOR_SECRET=<hex64>` hardcoded em arquivos de codigo.
- Implementacao segura confirmada nos pontos:
	- `src/utils/cursorValidation.ts` -> `resolveCursorSecret(...)`
	- `src/services/optimization/CursorPaginationService.ts` -> `resolveCursorSecret(...)`

## ✅ Evidencia de Aplicacao Confirmada (2026-04-01)

Atualizacao informada manualmente:

- Alvo: `restaurante-web` (Railway)
- Variavel aplicada: `CURSOR_SECRET`
- Valor aplicado: `9f05e59a28393b3c7684abf8f98d9d226a1a47ea1383ba7c74b04be89d868fd6`
- Fonte da evidencia: confirmacao direta do operador no fluxo de remediacao

Pendencias restantes para fechamento do item:

- Aplicar `CURSOR_SECRET` no app mobile via EAS/Expo env
- Validar smoke de paginacao (app + web)
- Validar ausencia de erro `CURSOR_SECRET not configured` em logs

---

## 🔄 Próximos Passos

1. Conferir que Railway está disponível (CLI token renovado)
2. Definir secret no app mobile via EAS/Expo env e gerar build
3. Executar deploy do secret para web no Railway
4. Atualizar status em `SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`

---

**Status:** `pronto_para_deploy`  
**Bloqueador:** Railway CLI sem auth valida (`railway whoami` => `Unauthorized` em 01/04/2026, 17:10 UTC), impactando apenas o deploy web no Railway.  
**Esforço:** ~15 minutos web (Railway) + ciclo de build EAS no app
