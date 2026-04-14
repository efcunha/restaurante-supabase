# Handoff D+1 - pos_device_bindings (RLS, smoke e evidencias)

Data de referencia: **2026-04-14**

## 1. Objetivo deste handoff

Consolidar o estado operacional de `pos_device_bindings` apos:

1. apply da migration;
2. validacao estrutural remota (RLS, policies, indices, trigger, versao);
3. validacao pratica de isolamento multi-tenant;
4. ajuste de scripts para estabilidade em Windows/Git Bash.

## 2. Estado atual (executivo)

- Migration aplicada e registrada: `20260413233000_create_pos_device_bindings.sql`.
- Verificacao estrutural: **OK** (`verify_exit_code=0`).
- Smoke de RLS: **OK** (`smoke_exit_code=0`).
- Modo de smoke adotado como padrao para ambiente single-tenant: `cross-tenant-transactional`.
- Resultado consolidado: **GO**.

Evidencia principal:

- `database-backup/logs/evidencias/pos-device-bindings-validation-summary-20260414T011328Z.md`

## 3. O que foi alterado

### 3.1 Scripts (database-backup)

- Novo smoke transacional cross-tenant:
  - `database-backup/scripts/smoke_pos_device_bindings_rls_cross_tenant_transactional.sql`
  - `database-backup/scripts/smoke-pos-device-bindings-rls-cross-tenant-transactional.sh`
- Captura de evidencias passou a usar modo transacional quando `RLS_SMOKE_OTHER_COMPANY_USER_ID` nao for informado:
  - `database-backup/scripts/capture-pos-device-bindings-validation-evidence.sh`
- Compatibilidade Windows/Git Bash: priorizacao de `psql.exe`:
  - `database-backup/scripts/verify-pos-device-bindings.sh`
  - `database-backup/scripts/smoke-pos-device-bindings-rls.sh`
  - `database-backup/scripts/smoke-pos-device-bindings-rls-single-tenant.sh`
  - `database-backup/scripts/select-rls-smoke-candidates.sh`

### 3.2 Documentacao

- Runbook oficial atualizado com modo recomendado `cross-tenant-transactional`:
  - `docs/maquininha/16-runbook-pos-device-bindings-apply-verification.md`
- Alinhamento em maquininha:
  - `docs/maquininha/README.md`
- Alinhamento em balanca:
  - `docs/balanca/07-checklist-homologacao-usb-serial-tef-balanca.md`
  - `docs/balanca/README.md`

## 4. Fluxo padrao de validacao (retomada rapida)

### 4.1 Validacao completa (recomendada)

```bash
cd d:/restaurante-supabase/database-backup
bash scripts/capture-pos-device-bindings-validation-evidence.sh
```

### 4.2 Smoke cross-tenant transacional direto

```bash
cd d:/restaurante-supabase/database-backup
bash scripts/smoke-pos-device-bindings-rls-cross-tenant-transactional.sh
```

## 5. Regras operacionais importantes

1. Em Windows/Git Bash, manter `psql.exe` como preferencia nos scripts (evita `stdout is not a tty` / exit 130).
2. `cross-tenant-transactional` nao persiste dados (usa transacao com `ROLLBACK`).
3. `smoke-pos-device-bindings-rls-single-tenant.sh` permanece apenas como diagnostico legado.
4. Quando houver duas companies reais para teste dirigido, ainda e valido usar `smoke-pos-device-bindings-rls.sh` com usuarios reais.

## 6. Riscos residuais

1. O smoke transacional valida isolamento de leitura entre tenants no escopo do teste, mas nao substitui cobertura E2E de ponta-a-ponta em fluxos de negocio completos.
2. Mudancas futuras em trigger/funcoes de `auth.users` -> `public.profiles` podem impactar o setup temporario de usuario no smoke transacional.
3. Qualquer alteracao em policies de `profiles` ou `pos_device_bindings` exige reexecucao imediata da captura de evidencias.

## 7. Checklist de inicio para o proximo turno

1. Rodar `capture-pos-device-bindings-validation-evidence.sh` e anexar novo summary.
2. Confirmar `overall_result=GO` no summary mais recente.
3. Se houver alteracao de policy/migration, repetir verify + smoke na mesma sessao.
4. Atualizar docs afetadas (maquininha/balanca/repository) no mesmo PR da mudanca.

## 8. Referencias de controle

- `docs/maquininha/15-blueprint-tef-local-usb-device-binding.md`
- `docs/maquininha/16-runbook-pos-device-bindings-apply-verification.md`
- `database-backup/migrations/20260413233000_create_pos_device_bindings.sql`
- `database-backup/scripts/verify_pos_device_bindings.sql`