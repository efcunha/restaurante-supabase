# 16 - Runbook: apply e verificacao da migration pos_device_bindings

Ultima atualizacao: **2026-04-14**

## 1. Objetivo

Aplicar e validar com seguranca a migration:

- `database-backup/migrations/20260413233000_create_pos_device_bindings.sql`

com checagem de:

1. tabela/colunas;
2. RLS + policies;
3. indices;
4. trigger `updated_at`;
5. versao no `supabase_migrations.schema_migrations`.

## 2. Pre-requisitos

1. Arquivo `database-backup/.env.local` configurado com `SOURCE_DB_*`.
2. `psql` disponivel no ambiente (em Windows/Git Bash, os scripts priorizam `psql.exe` para evitar erro de TTY em execucao nao interativa).
3. Credencial com permissao para DDL no banco alvo.

## 3. Apply da migration (manual/CLI)

> Se voce ja usa o fluxo padrao de apply de migrations no projeto, mantenha o mesmo procedimento.

Opcoes comuns:

1. via pipeline/rotina oficial de migration do projeto;
2. via SQL controlado no banco alvo;
3. via Supabase CLI no fluxo já estabelecido no repositorio.

## 4. Verificacao remota automatizada

Executar:

```bash
cd d:/restaurante-supabase/database-backup
bash scripts/verify-pos-device-bindings.sh
```

Esse script executa:

- `database-backup/scripts/verify_pos_device_bindings.sql`

## 5. Critérios de aceite

1. `public.pos_device_bindings` existe.
2. `rls_enabled=true` e `rls_forced=true`.
3. Policies esperadas presentes:
   - `pos_device_bindings_service_role_manage`
   - `pos_device_bindings_select_same_company`
   - `pos_device_bindings_manage_admin_company`
4. Indices esperados presentes:
   - `idx_pos_device_bindings_unique_role_active`
   - `idx_pos_device_bindings_company_terminal`
   - `idx_pos_device_bindings_company_role`
   - `idx_pos_device_bindings_fingerprint`
   - `idx_pos_device_bindings_last_seen`
5. Trigger `pos_device_bindings_set_updated_at` presente.
6. Versao `20260413233000` presente em `supabase_migrations.schema_migrations`.

## 6. Evidencia recomendada

1. Captura da saida do script de verificacao.
2. Referencia do ambiente alvo e timestamp UTC.
3. Registro no PR/Change log com resultado `GO/NO-GO`.

## 7. Referencias

1. `database-backup/migrations/20260413233000_create_pos_device_bindings.sql`
2. `database-backup/scripts/verify_pos_device_bindings.sql`
3. `database-backup/scripts/verify-pos-device-bindings.sh`
4. `database-backup/scripts/smoke_pos_device_bindings_rls.sql`
5. `database-backup/scripts/smoke-pos-device-bindings-rls.sh`
6. `database-backup/scripts/smoke_pos_device_bindings_rls_cross_tenant_transactional.sql`
7. `database-backup/scripts/smoke-pos-device-bindings-rls-cross-tenant-transactional.sh`
8. `docs/maquininha/15-blueprint-tef-local-usb-device-binding.md`

## 8. Smoke test RLS (validacao pratica)

Depois do apply e da verificacao estrutural, execute smoke test de RLS.

### Modo recomendado (padrao): cross-tenant transacional

Nao depende de segunda company preexistente e nao persiste dados (usa `ROLLBACK` no final):

```bash
cd d:/restaurante-supabase/database-backup

export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company_A>"  # opcional (auto-select se ausente)
export RLS_SMOKE_TERMINAL_ID="caixa_01"

bash scripts/smoke-pos-device-bindings-rls-cross-tenant-transactional.sh
```

Resultado esperado:

1. Admin/gerente da company real insere e enxerga registro de teste.
2. Usuario temporario de outra company nao enxerga o registro.
3. Registro de teste e removido e transacao e revertida (`ROLLBACK`).

### Modo alternativo: cross-tenant com usuarios reais de companies diferentes

Use quando houver duas companies reais para validacao manual dirigida:

```bash
cd d:/restaurante-supabase/database-backup

export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company_A>"
export RLS_SMOKE_OTHER_COMPANY_USER_ID="<uuid_profile_company_B>"
export RLS_SMOKE_TERMINAL_ID="caixa_01"

bash scripts/smoke-pos-device-bindings-rls.sh
```

Resultado esperado:

1. Admin/gerente da company A insere e enxerga registro de teste.
2. Usuario de outra company nao enxerga o registro.
3. Registro de teste e removido no mesmo fluxo e transacao final e revertida (`ROLLBACK`).

Se precisar localizar candidatos automaticamente:

```bash
cd d:/restaurante-supabase/database-backup
bash scripts/select-rls-smoke-candidates.sh
```

Quando existir mais de uma company em `public.profiles`, o script imprime os `export` prontos para rodar o smoke com usuarios reais.

### Legado: fallback single-tenant

O script abaixo permanece para diagnostico rapido local, mas nao e mais o caminho principal de evidenciacao:

```bash
cd d:/restaurante-supabase/database-backup
bash scripts/smoke-pos-device-bindings-rls-single-tenant.sh
```

## 9. Captura consolidada de evidência (recomendado)

Para gerar logs + resumo markdown em uma execução:

```bash
cd d:/restaurante-supabase/database-backup

export RLS_SMOKE_ADMIN_USER_ID="<uuid_profile_admin_company_A>"  # opcional (auto-select se ausente)
# export RLS_SMOKE_OTHER_COMPANY_USER_ID="<uuid_profile_company_B>"  # opcional: se ausente, usa modo cross-tenant-transacional
export RLS_SMOKE_TERMINAL_ID="caixa_01"

bash scripts/capture-pos-device-bindings-validation-evidence.sh
```

PowerShell (Windows):

```powershell
cd d:/restaurante-supabase/database-backup

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-pos-device-bindings-validation-evidence.ps1 \
   -RlsSmokeAdminUserId "<uuid_profile_admin_company_A>" \
   -RlsSmokeOtherCompanyUserId "<uuid_profile_company_B>" \
   -RlsSmokeTerminalId "caixa_01"
```

Artefatos gerados em:

- `database-backup/logs/evidencias/`
   - `pos-device-bindings-verify-*.log`
   - `pos-device-bindings-smoke-*.log`
   - `pos-device-bindings-validation-summary-*.md`

Interpretacao de `smoke_mode` no summary:

1. `cross-tenant`: executou com usuarios reais de companies diferentes.
2. `cross-tenant-transactional`: executou com tenant/usuario temporarios em transacao (sem persistencia).
