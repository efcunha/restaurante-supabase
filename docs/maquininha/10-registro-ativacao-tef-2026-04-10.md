# 10 - Registro de ativacao TEF em producao (2026-04-10)

Status da decisao: Go
Referencia: docs/maquininha/08-runbook-ativacao-tef-producao-hoje.md

## 1. Dados da ativacao

- Data da ativacao: 2026-04-10
- Janela operacional: preencher no inicio
- Responsavel tecnico: preencher
- Responsavel de negocio: preencher
- Tenant alvo: preencher

## 2. Pre-check objetivo (antes de ativar)

- Decisao formal Go registrada: OK
- Evidencias INT_REAL atualizadas: OK
- Seguranca e isolamento validados: OK
- Rollback imediato documentado: OK

## 3. Snapshot de saude pre-ativacao (coleta automatica)

Horario UTC de coleta: 2026-04-10T17:41:26Z

- GET /healthz: HTTP 200
- Payload /healthz:

```json
{"ok":true,"service":"restaurante-ops","env":"production"}
```

- GET /api/status: HTTP 200
- Status geral reportado: operational
- lastChecked reportado: 2026-04-10T17:41:28.342Z

Snapshot pos-hotfix (validacao final):

- Horario UTC: 2026-04-10T18:50:14Z
- GET /healthz: HTTP 200
- GET /api/status: HTTP 200
- Status geral reportado: operational
- Arquivo de referencia: `restaurante-web/tmp/evidencias/tef-go-live-snapshot-20260410T185014Z.md`

## 4. Evidencias de validacao funcional (ciclo atual)

Arquivos:

- restaurante-web/tmp/evidencias/tef14-15-int-real.json
- restaurante-web/tmp/evidencias/tef14-15-int-real.md

Resultado consolidado:

- total=3
- passed=3
- failed=0
- skipped=0
- criterios-chave: TEF-14 passed, TEF-15a passed, TEF-15b passed

Timestamp da evidencia markdown:

- 2026-04-10T17:38:31.913Z

Validacao funcional final pos-hotfix:

- Timestamp UTC: 2026-04-10T18:50:28.997Z
- Resultado: OK total=3 passed=3 failed=0 skipped=0
- Criterios-chave: TEF-14 passed, TEF-15a passed, TEF-15b passed

Revalidacao pos-deploy Pix/USB (ciclo atual):

- Snapshot UTC: 2026-04-10T19:40:20Z
- Resultado: OK total=3 passed=3 failed=0 skipped=0
- Criterios-chave: TEF-14 passed, TEF-15a passed, TEF-15b passed
- Arquivo de referencia: restaurante-web/tmp/evidencias/tef-go-live-snapshot-20260410T194020Z.md

## 5. Acao de ativacao

- Hora de ativacao efetiva: preencher
- Operador executor: preencher
- Evidencia da alteracao de flag: anexar referencia

Comando recomendado para snapshot pos-ativacao:

```bash
cd d:/restaurante-supabase/restaurante-web
npm run ops:tef:snapshot:prod-web
```

## 6. Observacao da primeira hora

- Inicio observacao: 2026-04-10T18:50:14Z
- Fim observacao: 2026-04-10T19:40:20Z
- Resultado final da observacao: estavel no ciclo de validacao final (incluindo revalidacao pos-deploy)

Checklist rapido:

- [x] healthz/status estaveis durante a janela
- [x] initiate/status sem degradacao relevante
- [x] sem vazamento sensivel em logs
- [x] sem desvio de isolamento por company_id

## 7. Decisao pos-ativacao

- [x] Manter TEF ativo
- [ ] Acionar rollback imediato

Observacao:

- Snapshot final de operacao e funcional concluido com sucesso (3/3) apos deploy/hotfix.

Se rollback:

- Hora do rollback: preencher
- Motivo: preencher
- Acao executada: desativacao de FEATURE_CARD_MACHINE
- Incidente aberto: preencher identificador
