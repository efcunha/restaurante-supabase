# PR Description - pos_device_bindings hardening and validation

## Resumo

Este PR consolida o hardening operacional de `pos_device_bindings` com foco em validacao de RLS, evidencias reprodutiveis e estabilidade de scripts no Windows/Git Bash.

Principais entregas:

1. Smoke cross-tenant transacional (sem persistencia) para ambientes single-tenant.
2. Captura consolidada de evidencias com selecao automatica de modo de smoke.
3. Compatibilidade de automacao em Windows/Git Bash via priorizacao de `psql.exe`.
4. Atualizacao de runbooks e docs de maquininha/balanca/repository para refletir o fluxo oficial.

## 🔒 Security Gate — Checklist obrigatório para esta mudança

[x] Nenhum secret hardcoded (verificado em todo código proposto)
[x] Menor privilégio aplicado: service role key não exposta ao cliente
[x] Input validation presente em todas as bordas do sistema afetadas
[x] RLS cobre os novos dados/tabelas envolvidos
[x] CORS/headers de segurança preservados ou endurecidos
[x] Logs não expõem PII em texto claro
[x] Idempotência garantida em operações de billing/webhook
[x] Smoke test planejado para validação pós-deploy
[x] LGPD verificada (se PII envolvido)
[x] Evidência de validação será documentada no mesmo ciclo de trabalho

## Escopo técnico

### Scripts alterados

- `database-backup/scripts/capture-pos-device-bindings-validation-evidence.sh`
- `database-backup/scripts/select-rls-smoke-candidates.sh`
- `database-backup/scripts/smoke-pos-device-bindings-rls-single-tenant.sh`
- `database-backup/scripts/smoke-pos-device-bindings-rls.sh`
- `database-backup/scripts/verify-pos-device-bindings.sh`
- `database-backup/scripts/smoke-pos-device-bindings-rls-cross-tenant-transactional.sh` (novo)

### Documentação alterada

- `docs/README.md`
- `docs/maquininha/16-runbook-pos-device-bindings-apply-verification.md`
- `docs/maquininha/README.md`
- `docs/balanca/07-checklist-homologacao-usb-serial-tef-balanca.md`
- `docs/balanca/README.md`
- `docs/repository/README.md`
- `docs/repository/HANDOFF_D1_POS_DEVICE_BINDINGS_2026-04-14.md` (novo)

## Decisões técnicas

1. **Padrao de smoke em ambiente single-tenant**: `cross-tenant-transactional`.
2. **Nao persistencia de dados de teste**: fluxo inteiro encapsulado em transacao com `ROLLBACK`.
3. **Resiliencia no Windows**: scripts passaram a priorizar `psql.exe` para evitar erro de TTY (`stdout is not a tty` / exit 130).
4. **Fallback legado**: `single-tenant` mantido apenas para diagnostico rapido, nao como caminho principal de evidenciacao.

## Evidências e validação

Execuções relevantes:

1. Smoke cross-tenant transacional: **OK**.
2. Captura consolidada (verify + smoke): **OK**.

Evidência principal:

- `database-backup/logs/evidencias/pos-device-bindings-validation-summary-20260414T011328Z.md`

Resultado consolidado:

- `verify_exit_code=0`
- `smoke_exit_code=0`
- `smoke_mode=cross-tenant-transactional`
- `overall_result=GO`

## Impacto esperado

- Maior confiabilidade operacional na validacao de isolamento multi-tenant.
- Menor dependencia de dados preexistentes para provar cross-tenant.
- Melhor repetibilidade de evidencias em CI/manual runbooks.

## Riscos residuais

1. O smoke transacional nao substitui E2E de ponta-a-ponta dos fluxos de negocio.
2. Alteracoes futuras em trigger/funcoes de sincronizacao `auth.users` -> `public.profiles` podem exigir ajuste do smoke.
3. Mudancas em policies RLS devem obrigatoriamente reexecutar capture de evidencias no mesmo ciclo.

## Plano de rollback

1. Reverter scripts alterados para versao anterior.
2. Reverter documentacao para modo anterior de smoke.
3. Executar `verify-pos-device-bindings.sh` para confirmar estado estrutural apos rollback.

## Checklist final do PR

[x] Escopo limitado ao objetivo de validacao RLS/evidencias
[x] Sem alteracao de schema adicional
[x] Sem alteracao de comportamento de producao fora do fluxo de validacao
[x] Documentacao atualizada e indexada
[x] Evidencias anexadas/referenciadas