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

## 5. Acao de ativacao

- Hora de ativacao efetiva: preencher
- Operador executor: preencher
- Evidencia da alteracao de flag: anexar referencia

## 6. Observacao da primeira hora

- Inicio observacao: preencher
- Fim observacao: preencher
- Resultado final da observacao: preencher

Checklist rapido:

- [ ] healthz/status estaveis durante a janela
- [ ] initiate/status sem degradacao relevante
- [ ] sem vazamento sensivel em logs
- [ ] sem desvio de isolamento por company_id

## 7. Decisao pos-ativacao

- [ ] Manter TEF ativo
- [ ] Acionar rollback imediato

Se rollback:

- Hora do rollback: preencher
- Motivo: preencher
- Acao executada: desativacao de FEATURE_CARD_MACHINE
- Incidente aberto: preencher identificador
