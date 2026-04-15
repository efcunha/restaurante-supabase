# Form Automation Request Files

Índice de arquivos para automação semi-automática segura de formulários.

## Arquivos de referência

### Exemplos gerais (com validação e gates, sem apply)

- **[change-request.example.json](change-request.example.json)**
  - Propósito: Template genérico com todas as seções para proposta e validação.
  - Uso: Base para criar novas propostas de mudança em formulários.
  - Aplicabilidade: Qualquer fluxo de UI que não seja crítico.
  - Gates: Nenhum (padrão).
  - Output: Plano somente, sem aplicação.

- **[approval.example.json](approval.example.json)**
  - Propósito: Template de arquivo de aprovação auditável para apply com rastreabilidade.
  - Uso: Quando aprovações precisam ser documentadas e assinadas.
  - Campos obrigatórios: `approver`, `approvedAt` (ISO 8601).
  - Aplicabilidade: Mudanças sensíveis que exigem auditoria ou conformidade.
  - Output: Audit trail em `approval-audit.json`.

## Exemplos seguros (preflight + plan, sem apply)

Estes arquivos foram criados para demonstrar ciclos seguro de **nenhum impacto** na codebase. Ideais para validação, testes E2E ou apresentações.

### [change-request.safe-operational-settings.json](change-request.safe-operational-settings.json)

- **Descrição**: Ajuste de labels e placeholders em tela de configurações operacionais.
- **Formulário alvo**: `ConfiguracaoOperacionalForm` (web).
- **Risco**: Baixo (UI cosmética, sem lógica de negócio).
- **Gates**: Nenhum.
- **Caso de uso**:
  - Melhorias de i18n em UI de configuração.
  - Ajustes de UX (labels mais claros, placeholders informativos).
  - Validações local antes de deploy.
  - Testes E2E da integração sem efetivamente aplicar mudanças.
- **Workflow seguro**:
  ```bash
  # Preflight estrito (sem apply)
  node scripts/form-automation/semi-auto-form-flow.mjs preflight \
    --change-file docs/forms/requests/change-request.safe-operational-settings.json \
    --strict-targets
  
  # Plano (visualiza diffs sem aplicar)
  node scripts/form-automation/semi-auto-form-flow.mjs plan \
    --change-file docs/forms/requests/change-request.safe-operational-settings.json
  ```

### [change-request.safe-configuracao-mesas.json](change-request.safe-configuracao-mesas.json)

- **Descrição**: Reorganização de campos de configuração de mesas (dimensões, padrão).
- **Formulário alvo**: `ConfiguracaoMesasForm` (web).
- **Risco**: Baixo (mudança de ordem e agrupamento de campos, sem validação alterada).
- **Gates**: Nenhum.
- **Caso de uso**:
  - Refatoração UX de formulário sem comportamento diferente.
  - Validação de que o script consegue resolver formulários compostos.
  - Prototipagem de mudanças antes de submissão com aprovação.
- **Workflow seguro**:
  ```bash
  # Plano com relatório detalhado
  node scripts/form-automation/semi-auto-form-flow.mjs plan \
    --change-file docs/forms/requests/change-request.safe-configuracao-mesas.json
  
  # Revisar artefatos gerados em tmp/form-automation/
  # - form-change-report.md (detalhes das alterações)
  # - proposed-diffs/ (visualize o diff real)
  # - validation-results.json (checklist de validação)
  ```

### [change-request.safe-configuracao-estoque.json](change-request.safe-configuracao-estoque.json)

- **Descrição**: Simplificação de UI de configuração de estoque (remove campos redundantes, mantém lógica).
- **Formulário alvo**: `ConfiguracaoEstoqueForm` (web).
- **Risco**: Baixo-médio (redução de campos, sem impacto em fluxo crítico de venda).
- **Gates**: Nenhum.
- **Caso de uso**:
  - Validar que o script consegue aplicar mudanças em formulários que dependem de serviços.
  - Testar pipeline de validação com checklist completo (tipos, testes, i18n).
  - Demonstrar capacidade do fluxo em ambiente integrado.
- **Workflow seguro**:
  ```bash
  # Validação local + plan
  npm run type-check  # Valida tipos antes
  
  node scripts/form-automation/semi-auto-form-flow.mjs plan \
    --change-file docs/forms/requests/change-request.safe-configuracao-estoque.json
  
  # Revisar artefatos em tmp/form-automation/
  npm run test  # Testes locais afetados
  ```

## Workflow recomendado

### Para proposta sem impacto (validação/testes)

1. Escolha um arquivo `safe-*`.
2. Execute `preflight --strict-targets` para validar resolução de alvos.
3. Execute `plan` para gerar relatório.
4. Revise artefatos em `tmp/form-automation/`:
   - `form-change-report.md` (diffs propostos)
   - `validation-results.json` (checklist)
   - `pending-approvals.md` (gates pendentes, se houver)
5. Integre evidências em testes E2E ou documentação.

### Para aplicação real com aprovação

1. Prepare arquivo de `change-request` customizado com suas mudanças.
2. Execute `preflight --strict-targets` para validar.
3. Execute `plan` e revise `pending-approvals.md`.
4. Se há gates:
   - Prepare arquivo de `approval.example.json`.
   - Assine com `approver` e `approvedAt`.
5. Execute `apply` com `--approval-file` ou flags `--approve-*` explícitos.
6. Anexe artefatos no PR (especialmente `security-gate.md`, `approval-audit.json`).
7. Valide testes e smoke.

## Estrutura de artefatos esperados

Todo ciclo de `preflight`, `plan` ou `apply` gera evidências em `tmp/form-automation/`:

| Arquivo | Descrição |
|---------|-----------|
| `form-change-summary.json` | Resumo estruturado: alvos, seções, mudanças |
| `target-resolution.json` | Resolução de cada formulário-alvo (caminho real, versão encontrada) |
| `form-change-report.md` | Relatório markdown com detalhes legíveis de mudanças por arquivo |
| `proposed-diffs/*.diff` | Diffs reais propostos (um por arquivo afetado) |
| `security-gate.md` | Checklist de risco e gates aplicáveis |
| `validation-results.json` | Resultado de validação estruturado (tipos, testes, i18n, segurança) |
| `pr-description-draft.md` | Template de descrição de PR pronto para usar |
| `approval-audit.json` | Auditoria de aprovações (se `--approval-file` usado) |
| `pending-approvals.md` | Lista de gates ainda pendentes no modo `plan` |

## Checklist de operação

- [ ] Rodar `preflight --strict-targets` com arquivo de request.
- [ ] Revisar `pending-approvals.md` se houver.
- [ ] Rodar `plan` e revisar diffs em `proposed-diffs/`.
- [ ] Se aplicando: preparar approval file com `approver` e `approvedAt`.
- [ ] Executar `apply` somente com aprovação e arquivo de auditoria.
- [ ] Validar testes locais relevantes (type-check, test, E2E).
- [ ] Anexar evidências completas de `tmp/form-automation/` no PR.
- [ ] Confirmar nenhum secret hardcoded nos diffs.

## Referências

- Documentação completa: [docs/repository/FORM_AUTOMATION_SEMI_AUTO_RUNBOOK.md](../repository/FORM_AUTOMATION_SEMI_AUTO_RUNBOOK.md)
- Script principal: [scripts/form-automation/semi-auto-form-flow.mjs](../../../scripts/form-automation/semi-auto-form-flow.mjs)
- Teste de script: [scripts/form-automation/__tests__/semi-auto-form-flow.test.mjs](../../../scripts/form-automation/__tests__/semi-auto-form-flow.test.mjs)
- Guia de uso operacional: [docs/PROMPT_AUTOMACAO_SEMI_AUTOMATICA_FORMULARIOS.md](../PROMPT_AUTOMACAO_SEMI_AUTOMATICA_FORMULARIOS.md)
