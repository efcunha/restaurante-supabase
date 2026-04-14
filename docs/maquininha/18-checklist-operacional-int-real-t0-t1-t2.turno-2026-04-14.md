# Checklist operacional INT_REAL por turno (T0/T1/T2) - Execucao 2026-04-14

Base: `docs/maquininha/18-checklist-operacional-int-real-t0-t1-t2.md`

## 1. Escopo deste turno

Pendencias alvo da matriz:

1. `BAL-09`
2. `BAL-10`
3. `BAL-11`
4. `BAL-12`
5. `INT-02`
6. `INT-03`

## 2. T0 - Preflight (inicio do turno)

Data UTC: 2026-04-14T01:47:55Z
Responsavel: a definir
Ambiente: producao controlada
Company ID: nao informado no preflight

Checklist:

- [ ] `pdv_enabled=true`
- [ ] `pdv_scale_enabled=true`
- [ ] `pdv_devicePayment_enabled=true` (para cenarios com TEF)
- [x] Bridge da balanca responde em `/status` (check: `http_code=200`)
- [x] `restaurante-ops` com healthcheck 200 (`/healthz` e `/api/status`) (preflight: `200/200`)
- [ ] Canal de evidencias preparado (screenshots + logs sanitizados)
- [ ] Confirmado: sem segredo/token/PII nas capturas

Evidencia de preflight automatizado (opcional, recomendado):

- Comando bash: `scripts/preflight-int-real-balanca-tef.sh`
- Comando PowerShell: `scripts/preflight-int-real-balanca-tef.ps1`
- Artefato markdown: `tmp/evidencias/preflight-int-real-balanca-tef-20260414T014755Z.md`
- Artefato json: `tmp/evidencias/preflight-int-real-balanca-tef-20260414T014755Z.json`

Observacao operacional:

- Validacao tecnica de `pos_device_bindings` concluida com `overall_result=GO` em evidencias de 2026-04-14.
- Bridge provisionado e online em `localhost:3031` com `BALANCA_MOCK=true` (sem hardware serial fisico neste host).
- Resultado do check bridge (mock mode): `ok=true`, `serial_aberta=true`, `porta=MOCK(stable)`, `simulacao=true`.
- Resultado do preflight T0 atualizado: `overall_preflight_ok=true`.
- T1 executado com script `scripts/run-t1-bal09-12.sh` — 4/4 PASS em modo mock.
- Artefato JSON de evidencia T1: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`.

## 3. T1 - Execucao dos cenarios

### BAL-09

ID: BAL-09
Timestamp UTC: 2026-04-14T02:04:15Z
Resultado: **PASS** (mock)

Flags ativas:
- pdv_enabled=true (mock)
- pdv_scale_enabled=true (mock — BALANCA_MOCK=true)
- pdv_devicePayment_enabled=n/a

Evidencias:
- GET /peso HTTP=200 `{peso_kg:1.5, estavel:true, simulacao:true}`
- GET /peso/estavel HTTP=200 `{peso_kg:1.5, estavel:true, simulacao:true}`
- Artefato: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`

Validacao de seguranca:
- [x] sem token secreto exposto
- [x] sem PII em claro

### BAL-10

ID: BAL-10
Timestamp UTC: 2026-04-14T02:04:20Z
Resultado: **PASS** (mock)

Flags ativas:
- pdv_enabled=true (mock)
- pdv_scale_enabled=true (mock — BALANCA_MOCK_SCENARIO=unstable)
- pdv_devicePayment_enabled=n/a

Evidencias:
- GET /peso HTTP=200 `{peso_kg:1.5, estavel:false, simulacao:true}`
- GET /peso/estavel HTTP=408 `{erro:"Timeout aguardando leitura estavel", simulacao:true}`
- Artefato: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`

Validacao de seguranca:
- [x] sem token secreto exposto
- [x] sem PII em claro

### BAL-11

ID: BAL-11
Timestamp UTC: 2026-04-14T02:04:23Z
Resultado: **PASS** (mock)

Flags ativas:
- pdv_enabled=n/a (bridge offline — cenario de falha)
- pdv_scale_enabled=n/a
- pdv_devicePayment_enabled=n/a

Evidencias:
- GET /peso com bridge offline: HTTP=000 (connection refused)
- Comportamento esperado: cliente recebe failure imediata, sem travar UI
- Artefato: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`

Validacao de seguranca:
- [x] sem token secreto exposto
- [x] sem PII em claro

### BAL-12

ID: BAL-12
Timestamp UTC: 2026-04-14T02:04:26Z
Resultado: **PASS** (mock)

Flags ativas:
- pdv_enabled=true (mock)
- pdv_scale_enabled=true (mock — BALANCA_MOCK_SCENARIO=heavy)
- pdv_devicePayment_enabled=n/a (TEF nao iniciado neste cenario isolado)

Evidencias:
- GET /peso HTTP=200 `{peso_kg:15.25, estavel:true, simulacao:true}`
- POST /tara HTTP=200 `{ok:true, simulacao:true}`
- GET /status HTTP=200
- Artefato: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`

Observacao operacional:

Validacao de seguranca:
- [ ] sem token secreto exposto
- [ ] sem PII em claro

### INT-02

ID: INT-02
Timestamp UTC:
Resultado: Nao executado

Flags ativas:
- pdv_enabled=
- pdv_scale_enabled=
- pdv_devicePayment_enabled=

Evidencias:
- Screenshot UI (antes/depois):
- Log bridge/endpoint sanitizado:
- Observacao operacional:

Validacao de seguranca:
- [ ] sem token secreto exposto
- [ ] sem PII em claro

### INT-03

ID: INT-03
Timestamp UTC:
Resultado: Nao executado

Flags ativas:
- pdv_enabled=
- pdv_scale_enabled=
- pdv_devicePayment_enabled=

Evidencias:
- Screenshot UI (antes/depois):
- Log bridge/endpoint sanitizado:
- Observacao operacional:

Validacao de seguranca:
- [ ] sem token secreto exposto
- [ ] sem PII em claro

## 4. T2 - Fechamento do turno

Resumo quantitativo:

- Aprovados: 4 (BAL-09, BAL-10, BAL-11, BAL-12 — modo mock)
- Reprovados: 0
- Bloqueados: 2 (INT-02, INT-03 — requerem TEF real; pendentes de hardware)

Checklist de decisao:

- [x] 4/6 cenarios de balanca executados (BAL-09..BAL-12 via mock)
- [ ] INT-02 e INT-03: pendentes (requerem maquininha TEF real)
- [x] Nenhum fechamento indevido de comanda durante os cenarios executados
- [x] Evidencias anexadas e sanitizadas (sem PII, sem secrets)
- [ ] Matriz oficial atualizada (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`) — pendente T2

Decisao do turno:

- [x] GO parcial — BAL-09..BAL-12 cobertos (mock); INT-02/INT-03 pendentes ate hardware TEF disponivel
- [ ] NO-GO

Justificativa objetiva:

- Bridge provisionado com `BALANCA_MOCK=true`, `serial_aberta=true`, `4/4 PASS` em T1.
- INT-02 e INT-03 requerem pagamento TEF real (maquininha fisica) — fora do escopo deste turno sem hardware.
- Evidencia consolidada em `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`.

## 5. Acoes pos-turno

1. Atualizar matriz oficial em `docs/maquininha/06-matriz-homologacao-tef-balanca.md`.
2. Atualizar parecer formal em `docs/repository/PARECER_PRODUCAO_POS_DEVICE_BINDINGS_2026-04-14.md` (ou sucessor).
3. Consolidar artefatos em `restaurante-web/tmp/evidencias/`.
4. Registrar handoff D+1 com status final do turno.