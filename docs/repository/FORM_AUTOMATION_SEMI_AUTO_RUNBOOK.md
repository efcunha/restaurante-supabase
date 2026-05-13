# Runbook: Automacao Semi-Automatica de Formularios

## Objetivo

Padronizar a evolucao de formularios de UI entre design e codigo com seguranca operacional.

Principios:

1. Proposta primeiro, aplicacao depois.
2. Nenhuma alteracao sensivel sem aprovacao humana.
3. Evidencias obrigatorias por execucao.

## Escopo

O fluxo cobre:

1. Deteccao de formularios-alvo em web e app.
2. Checklist de risco (fluxo critico, validacao, i18n, testes, seguranca/LGPD).
3. Geracao de diffs propostos por arquivo.
4. Preparacao de evidencias para PR.

## Script oficial

- `scripts/form-automation/semi-auto-form-flow.mjs`

## Entradas padrao

- `docs/forms/requests/change-request.example.json`
- `docs/forms/requests/approval.example.json`

Exemplos seguros (sem apply):

- `docs/forms/requests/change-request.safe-operational-settings.json`
- `docs/forms/requests/change-request.safe-configuracao-mesas.json`
- `docs/forms/requests/change-request.safe-configuracao-estoque.json`

## Modos de execucao

### 1. Preflight estrito

Valida resolucao de alvos antes de qualquer aplicacao.

```bash
node scripts/form-automation/semi-auto-form-flow.mjs preflight \
  --change-file docs/forms/requests/change-request.example.json \
  --strict-targets
```

### 2. Proposta de alteracao (recomendado)

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json
```

### 3. Apply com aprovacoes explicitas

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply \
  --approve-critical NovoPedidoScreen \
  --approve-pii RegisterCompanyScreen \
  --approve-sensitive RegisterCompanyScreen
```

### 4. Apply com arquivo de aprovacao auditavel

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply \
  --approval-file docs/forms/requests/approval.example.json
```

## Gates obrigatorios

1. Fluxo critico: exige `--approve-critical <FormName>`.
2. PII: exige `--approve-pii <FormName>`.
3. Auth/Billing/RLS/CORS/Rate limiting: exige `--approve-sensitive <FormName>`.
4. Apply com approval file: exige `approver` e `approvedAt` (ISO) no arquivo de aprovacao.
5. Apply com gate pendente: encerra com exit code `2`.

## Artefatos de evidencias

Saida em `tmp/form-automation/`:

1. `form-change-summary.json`
2. `target-resolution.json`
3. `form-change-report.md`
4. `proposed-diffs/*.diff`
5. `security-gate.md`
6. `validation-results.json`
7. `pr-description-draft.md`
8. `approval-audit.json`
9. `pending-approvals.md`

## Checklist operacional

1. Rodar preflight com `--strict-targets`.
2. Rodar plan sem apply e revisar relatorio.
3. Revisar `pending-approvals.md` e confirmar gates necessarios.
4. Aplicar somente com aprovacao humana explicita.
5. Executar validacoes locais relevantes.
6. Anexar evidencias no PR.

## Definicao de pronto

1. Diffs revisados e aplicados com aprovacao.
2. Testes relevantes passando.
3. Sem regressao em fluxo critico.
4. Evidencias registradas.
5. PR description pronta.
