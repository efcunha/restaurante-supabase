# 12 - Handoff D+1 (Plantonista) - 2026-04-11

Objetivo: executar verificacao rapida de estabilidade do TEF em producao no inicio do dia e decidir manter operacao ou acionar rollback.

## 1. Checklist rapido (inicio de turno)

- [ ] Validar saude do ops (`/healthz` e `/api/status`)
- [ ] Rodar snapshot funcional TEF-14/15
- [ ] Confirmar resultado 3/3 (sem falha)
- [ ] Registrar horario e resultado no registro operacional
- [ ] Manter TEF ativo ou acionar rollback conforme criterio abaixo

## 2. Comando unico recomendado

```bash
cd d:/restaurante-supabase/restaurante-web
npm run ops:tef:snapshot:prod-web
```

Resultado esperado:

- `healthz HTTP: 200`
- `api/status HTTP: 200`
- `Resumo JSON: total=3 passed=3 failed=0 skipped=0`

Artefatos gerados:

- `restaurante-web/tmp/evidencias/tef-go-live-snapshot-<timestamp>.md`
- `restaurante-web/tmp/evidencias/tef14-15-int-real.json`
- `restaurante-web/tmp/evidencias/tef14-15-int-real.md`

## 3. Criterio objetivo de decisao

Manter TEF ativo quando:

- snapshot operacional 200/200 e
- validacao funcional TEF-14/15 com 3/3.

Acionar rollback imediato quando:

- qualquer falha de seguranca/isolamento,
- falha funcional critica (ex.: TEF-14 com erro 500),
- indisponibilidade relevante no `ops`.

## 4. Rollback rapido

1. Desativar `FEATURE_CARD_MACHINE` no `restaurante-ops`.
2. Manter metodos legados de pagamento ativos.
3. Registrar incidente com horario, causa e acao aplicada.

Referencia: `docs/maquininha/04-plano-execucao-testes-rollout.md`.

## 5. Nota operacional (exit code 130 em deploy)

`Exit code 130` normalmente indica interrupcao manual do processo (Ctrl+C) ou encerramento de sessao, nao erro de build/deploy por si so.

Se ocorrer:

1. Reexecutar o deploy do servico interrompido.
2. Validar `/healthz` e `/api/status` apos deploy.
3. Rodar `npm run ops:tef:snapshot:prod-web` para confirmar estado funcional.

## 6. Referencias do fechamento anterior

- Encerramento executivo: `docs/maquininha/11-encerramento-executivo-tef-2026-04-10.md`
- Registro operacional: `docs/maquininha/10-registro-ativacao-tef-2026-04-10.md`
- Runbook de ativacao: `docs/maquininha/08-runbook-ativacao-tef-producao-hoje.md`
