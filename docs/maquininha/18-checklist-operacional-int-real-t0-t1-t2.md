# 18 - Checklist operacional INT_REAL por turno (T0/T1/T2)

Ultima atualizacao: **2026-04-14**

## 1. Objetivo

Fornecer um checklist executavel por turno para concluir os cenarios `INT_REAL` pendentes da matriz TEF + balanca e emitir decisao final Go/No-Go com evidencias.

Escopo alvo:

1. `BAL-09`
2. `BAL-10`
3. `BAL-11`
4. `BAL-12`
5. `INT-02`
6. `INT-03`

Referencias:

- `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
- `docs/maquininha/17-plano-fechamento-int-real-balanca-tef.md`

## 2. Como usar

1. Preencher T0 antes de iniciar qualquer teste.
2. Executar T1 com coleta de evidencias por cenario.
3. Fechar T2 com decisao final e pendencias residuais.
4. Atualizar a matriz oficial e o parecer de producao no mesmo ciclo.

Comando recomendado para acelerar o T0 (gera evidencias JSON/MD):

```bash
cd d:/restaurante-supabase
SCALE_URL="http://SEU_HOST_BRIDGE:3031" OPS_URL="https://ops.restaurante-web.app.br" COMPANY_ID="UUID_DA_EMPRESA" AUTH_TOKEN="SEU_TOKEN" bash scripts/preflight-int-real-balanca-tef.sh
```

```powershell
cd d:/restaurante-supabase
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/preflight-int-real-balanca-tef.ps1 -ScaleUrl "http://SEU_HOST_BRIDGE:3031" -OpsUrl "https://ops.restaurante-web.app.br" -CompanyId "UUID_DA_EMPRESA" -AuthToken "SEU_TOKEN"
```

## 3. T0 - Preflight (inicio do turno)

Data UTC:
Responsavel:
Ambiente:
Company ID:

Checklist:

- [ ] `pdv_enabled=true`
- [ ] `pdv_scale_enabled=true`
- [ ] `pdv_devicePayment_enabled=true` (para cenarios com TEF)
- [ ] Bridge da balanca responde em `/status`
- [ ] `restaurante-ops` com healthcheck 200 (`/healthz` e `/api/status`)
- [ ] Canal de evidencias preparado (screenshots + logs sanitizados)
- [ ] Confirmado: sem segredo/token/PII nas capturas

Se qualquer item falhar: interromper execucao INT_REAL e registrar bloqueio.

## 4. T1 - Execucao dos cenarios

### 4.1 Template de registro por cenario

Use o bloco abaixo para cada ID (`BAL-09`, `BAL-10`, `BAL-11`, `BAL-12`, `INT-02`, `INT-03`):

```text
ID:
Timestamp UTC:
Resultado: Aprovado | Reprovado | Bloqueado

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
```

### 4.2 Ordem recomendada no turno

1. `BAL-09` -> peso estavel real
2. `BAL-10` -> leitura instavel real
3. `BAL-11` -> bridge indisponivel
4. `BAL-12` -> regressao com TEF habilitado
5. `INT-02` -> fluxo integrado peso + quitacao
6. `INT-03` -> bloquear fechamento com TEF em `processing`

## 5. T2 - Fechamento do turno

Resumo quantitativo:

- Aprovados:
- Reprovados:
- Bloqueados:

Checklist de decisao:

- [ ] Todos os 6 cenarios executados
- [ ] Nenhum fechamento indevido de comanda com TEF em `processing`
- [ ] Nenhuma divergencia entre status de pagamento e comanda
- [ ] Evidencias anexadas e sanitizadas
- [ ] Matriz oficial atualizada (`06-matriz-homologacao-tef-balanca.md`)

Decisao do turno:

- [ ] GO
- [ ] NO-GO

Justificativa objetiva:

## 6. Acoes pos-turno (obrigatorias)

1. Atualizar `docs/maquininha/06-matriz-homologacao-tef-balanca.md` com status real.
2. Atualizar parecer em `docs/repository/PARECER_PRODUCAO_POS_DEVICE_BINDINGS_2026-04-14.md` (ou sucessor).
3. Registrar artefatos em `restaurante-web/tmp/evidencias/`.
4. Se `NO-GO`, abrir plano corretivo com owner e prazo.

## 7. Critério de saida para declarar "100% operacional"

Somente declarar fechamento amplo quando:

1. os 6 cenarios acima estiverem `Coberto` na matriz;
2. houver evidencia auditavel para cada cenario;
3. o parecer final do ciclo estiver como `GO` sem bloqueadores abertos.