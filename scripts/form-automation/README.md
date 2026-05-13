# Fluxo Semi-Automatico Seguro de Formularios

Este pacote implementa um fluxo assistido para evolucao de formularios no monorepo, com foco em seguranca operacional, regressao controlada e evidencias para PR.

## Objetivo

1. Detectar formularios-alvo em web e app (quando aplicavel)
2. Comparar mudanca desejada com estrutura atual
3. Gerar plano por formulario (campos, validacoes, UX/a11y)
4. Gerar checklist de seguranca e regressao
5. Gerar diffs propostos por arquivo
6. Bloquear aplicacao automatica em areas sensiveis
7. Preparar artefatos de evidencias e rascunho de PR

## Comandos

### Somente proposta (recomendado)

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json
```

### Preflight de resolucao de formularios-alvo (strict)

```bash
node scripts/form-automation/semi-auto-form-flow.mjs preflight \
  --change-file docs/forms/requests/change-request.example.json \
  --strict-targets
```

### Aplicar patches nao sensiveis

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply
```

### Aplicar com aprovacao explicita de formulario critico

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply \
  --approve-critical NovoPedidoScreen
```

### Aplicar com aprovacao explicita de PII e area sensivel

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply \
  --approve-pii RegisterCompanyScreen \
  --approve-sensitive RegisterCompanyScreen
```

### Aplicar com arquivo formal de aprovacao humana

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --apply \
  --approval-file docs/forms/requests/approval.example.json
```

### Executar validacoes locais declaradas no request

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
  --change-file docs/forms/requests/change-request.example.json \
  --run-validation
```

## Gates obrigatorios implementados

- Nao aplica mudancas sem `--apply`
- Formulario critico exige `--approve-critical <FormName>`
- Patches com indicios de `auth`, `billing`, `RLS`, `CORS` ou `rate limiting` exigem `--approve-sensitive <FormName>`
- Formularios com impacto PII exigem `--approve-pii <FormName>`
- Nenhum secret e gerado ou armazenado pelo fluxo

## Saidas geradas

Padrao: `tmp/form-automation/`

- `form-change-summary.json`: consolidado tecnico
- `target-resolution.json`: mapa de resolucao de formularios para arquivos alvo
- `form-change-report.md`: resumo executivo + checklists
- `proposed-diffs/*.diff`: diffs por patch
- `security-gate.md`: checklist obrigatorio de seguranca
- `validation-results.json`: comandos de validacao e status
- `pr-description-draft.md`: rascunho de PR em ingles
- `approval-audit.json`: consolidado de aprovacoes humanas consideradas na execucao
- `pending-approvals.md`: lista de aprovacoes humanas pendentes por formulario

## Estrutura do change request

Use `docs/forms/requests/change-request.example.json` como base.

Campos principais:

- `forms[].name`: nome da tela/formulario
- `forms[].critical`: `true` para telas que exigem aprovacao humana
- `forms[].fields.add/remove/rename/validation`: mudancas esperadas
- `forms[].patches[]`: alteracoes assistidas por `search` e `replace`
- `validationCommands[]`: comandos locais relevantes
- `--approval-file`: arquivo JSON com aprovacoes humanas auditaveis

Campos minimos do `--approval-file` (modo apply auditavel):

- `approver`: identificacao de quem aprovou
- `approvedAt`: timestamp ISO da aprovacao
- `approvedCritical[]`, `approvedPii[]`, `approvedSensitive[]`: formularios aprovados por tipo de gate

## Limitacoes intencionais

- O fluxo nao substitui revisao humana.
- Diffs sao gerados para revisao e podem ser bloqueados por gates.
- Em caso de incerteza de regra de negocio, manter modo proposta e decidir manualmente.
- Em modo `--apply`, se houver bloqueio de gate, o comando encerra com exit code `2`.
