# REMEDIATION — `restaurante-supabase` — 22/06/2026

> Auditoria executada conforme `D:\ameg\PROMPT_INVESTIGACAO_RESTAURANTE_SUPABASE.md`
> Histórico do Git reescrito via `git filter-repo` em `ceb7e5e`.

## Resumo da exposição detectada

| Categoria | Item | Severidade |
|---|---|---|
| PII/LGPD | CPF `480.587.181-49`, `111.222.333-44`, `00575498188` | CRÍTICO |
| PII/LGPD | CNPJ `57139072000131` (com nome/razão social) | CRÍTICO |
| PII/LGPD | Endereço residencial real (Rua Arina Alves de Melo, João Pessoa/PB) | CRÍTICO |
| PII/LGPD | Telefones reais `(83) 99917-2452`, `(81) 98888-7777` | CRÍTICO |
| PII/LGPD | Email pessoal `edsonfcunha68@gmail.com` | ALTO |
| Android | `debug.keystore` (2257 B) no histórico | CRÍTICO |
| Android | `restaurante-release-key.keystore` (2806 B) no histórico | CRÍTICO |
| Firebase | `google-services.json` no histórico | ALTO |
| Service Account | `serviceAccountKey.json.bak` no histórico | ALTO |
| Local | `.env` plaintext (Firebase/Supabase/Evolution) em 4 sub-pacotes | ALTO (gitignored) |
| Local | `android/app/release.keystore` plaintext | CRÍTICO (gitignored) |

## Ações de rotação manual (obrigatórias)

### 1. Firebase (`restaurante-6f221`)
- [ ] Rotacionar **API key** (Android + iOS) em https://console.firebase.google.com/project/restaurante-6f221/settings/general
- [ ] Rotacionar **App Check** se ativado
- [ ] Atualizar Firebase Auth providers keys (secrets)
- [ ] Audit logs de acesso: https://console.firebase.google.com/project/restaurante-6f221/usage

### 2. Supabase (`ykalocfhnetxenvmtlcn.supabase.co`)
- [ ] Rotacionar **`SUPABASE_SERVICE_ROLE_KEY`** (god key!) em https://supabase.com/dashboard/project/ykalocfhnetxenvmtlcn/settings/api
- [ ] Rotacionar **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** (anon key)
- [ ] Verificar logs de API: https://supabase.com/dashboard/project/ykalocfhnetxenvmtlcn/logs/explorer
- [ ] Auditar RLS policies (dados podem ter sido extraídos enquanto expostos)
- [ ] Resetar **Database password**

### 3. Figma (Personal Access Tokens)
- [ ] Revogar todos os PATs antigos em https://www.figma.com/developers
- [ ] Gerar novo PAT apenas com escopos mínimos
- [ ] Atualizar `FIGMA_TOKEN` no `.env.local` (criptografar via DPAPI)

### 4. Cursor (Integrações)
- [ ] Revogar chaves de integração em https://www.cursor.com/settings
- [ ] Revogar tokens de IA / OpenAI keys (se aplicável)

### 5. Android keystore (CRÍTICO)
- [ ] **Regenerar** keystore de release:
  ```bash
  keytool -genkey -v \
    -keystore restaurante-release-key.keystore \
    -alias restaurante-upload \
    -keyalg RSA -keysize 2048 \
    -validity 10000
  ```
- [ ] **Atualizar Google Play Console** com nova chave de upload
- [ ] Notificar Google sobre comprometimento: https://support.google.com/googleplay/android-developer/contact/other
- [ ] Atualizar CI/CD secrets (Railway / EAS)
- [ ] Atualizar `restaurante-app/.env` com nova senha (criptografar)

### 6. Mercado Pago
- [ ] Revogar `MERCADOPAGO_ACCESS_TOKEN` em https://www.mercadopago.com.br/credentials
- [ ] Rotacionar `MERCADOPAGO_WEBHOOK_SECRET`
- [ ] Verificar logs de webhooks: https://www.mercadopago.com.br/ipn-notifications
- [ ] Verificar transações suspeitas

### 7. WhatsApp Evolution API (`evolution-api-production-203d4.up.railway.app`)
- [ ] Resetar `EXPO_PUBLIC_EVO_API_KEY` via painel Railway
- [ ] Verificar logs de uso em https://railway.app/project/<id>
- [ ] Considerar recriar a instância

### 8. Playwright E2E users
- [ ] Trocar senhas de `garcom01@admin.com`, `garcom02@admin.com`, `admin@admin.com`
- [ ] Habilitar 2FA se disponível
- [ ] Mover credenciais para `restaurante-web/.env.local` (criptografar)

## LGPD / Notificações

Como **PII real foi confirmada** no histórico (CPF, CNPJ, endereço, telefone), é obrigatório:

- [ ] **Notificar DPO** (Data Protection Officer) da organização
- [ ] **Avaliar comunicação à ANPD** (Autoridade Nacional de Proteção de Dados)
  - Prazo: razoável após conhecimento do incidente
  - Conteúdo: tipo de dados, número de titulares afetados, medidas tomadas
- [ ] **Notificar titulares afetados** se houver risco relevante
- [ ] **Documentar incidente** em registro interno (dataflow, mitigação, lições aprendidas)
- [ ] Revisar contrato com **hosting provider** (GitHub/Railway) sobre breach notification

### Dados pessoais comprometidos
- **Edson Fernandes Cunha** (admin) — CPF `480.587.181-49`, email `edsonfcunha68@gmail.com`, tel `(83) 99917-2452`
- **Luciana de Souza Machado** (admin/owner) — CNPJ `57139072000131`, tel `83999172452`, endereço Rua Arina Alves de Melo, 41 — Altiplano Cabo Branco, João Pessoa/PB, CEP 58046310
- **admin@admin.com** — CPF `111.222.333-44`, tel `(81) 98888-7777`
- Clientes de teste com endereços reais em João Pessoa/PB

## Pós-rotação: limpeza local

- [ ] Apagar `.env` plaintexts locais após confirmar que tudo foi rotacionado:
  ```powershell
  Remove-Item "D:\restaurante-supabase\restaurante-app\.env" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-app\.env.local" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-app\.env.staging" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-app\.maestro\.env.maestro" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-app\android\app\release.keystore" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-app\android\app\debug.keystore" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-web\.env" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-web\.env.local" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-web\.env.staging" -Force
  Remove-Item "D:\restaurante-supabase\restaurante-ops\.env" -Force
  Remove-Item "D:\restaurante-supabase\balanca-bridge\.env" -Force
  Remove-Item "D:\restaurante-supabase\database-backup\.env.local" -Force
  Remove-Item "D:\restaurante-supabase\database-backup\supabase\functions\.env.local" -Force
  ```
- [ ] Manter os `.env.dpapi.xml` (criptografados) como backup offline seguro
- [ ] Criar novos `.env.local` com credenciais rotacionadas
- [ ] Re-criptografar via DPAPI:
  ```powershell
  # Script em .githooks/setup-dpapi.ps1 (ou inline)
  ```

## Validação do hook `pre-push`

Para confirmar que o hook está protegendo:
```bash
python .githooks/pre-push
# Esperado: "OK - no secrets/PII detected in push."
```

## Histórico do incidente

| Data | Evento |
|---|---|
| 13/04/2026 | Criação inicial dos `.env` plaintext (gitignored) |
| 07/04/2026 | Criação dos `.env.staging` (gitignored) |
| 23/03/2026 | `database-backup/migrations/20260311161100_seed_data.sql` commitado com PII real |
| 20/01/2026 | `restaurante-release-key.keystore` commitado no root commit |
| 20/01/2026 | `google-services.json` commitado no root commit |
| 21/01/2026 | `release.keystore` untracked (mas blob persiste no histórico) |
| 13/05/2026 | `debug.keystore` untracked (mas blob persiste via tag `v12-baseline`) |
| 22/06/2026 | Auditoria executada; `git filter-repo` purga histórico; force-push para `ceb7e5e` |

## Contato para dúvidas
- DPO interno: <definir>
- ANPD: https://www.gov.br/anpd/
- LGPD texto integral: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
