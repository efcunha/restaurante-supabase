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
- Bridge provisionado e online em `localhost:3031`.
- Resultado do check bridge: `ok=true`, `serial_aberta=false`, `porta=COM3`, `baud=9600`, `protocolo=PRT2`.
- Resultado do preflight T0 atual: `overall_preflight_ok=false` (bridge online, mas serial ainda nao abriu para leitura real).
- Status do turno neste momento: **bloqueado parcialmente para iniciar T1 INT_REAL** ate ajustar porta/conexao fisica da balanca (ou confirmar porta serial correta no `.env` do bridge).

## 3. T1 - Execucao dos cenarios

### BAL-09

ID: BAL-09
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

### BAL-10

ID: BAL-10
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

### BAL-11

ID: BAL-11
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

### BAL-12

ID: BAL-12
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

- Aprovados: 0
- Reprovados: 0
- Bloqueados: 6 (execucao T1 nao iniciada; bridge online, mas serial da balanca ainda indisponivel)

Checklist de decisao:

- [ ] Todos os 6 cenarios executados
- [ ] Nenhum fechamento indevido de comanda com TEF em `processing`
- [ ] Nenhuma divergencia entre status de pagamento e comanda
- [ ] Evidencias anexadas e sanitizadas
- [ ] Matriz oficial atualizada (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`)

Decisao do turno:

- [ ] GO
- [x] NO-GO (provisorio ate restabelecer bridge e executar T1)

Justificativa objetiva:

- Preflight T0 atualizado com `bridge.status_http=200` e `ops 200/200`, porem `serial_aberta=false`.
- Sem serial aberta nao ha condicao de executar `BAL-09..BAL-12` nem os cenarios integrados `INT-02` e `INT-03` com hardware real.

## 5. Acoes pos-turno

1. Atualizar matriz oficial em `docs/maquininha/06-matriz-homologacao-tef-balanca.md`.
2. Atualizar parecer formal em `docs/repository/PARECER_PRODUCAO_POS_DEVICE_BINDINGS_2026-04-14.md` (ou sucessor).
3. Consolidar artefatos em `restaurante-web/tmp/evidencias/`.
4. Registrar handoff D+1 com status final do turno.