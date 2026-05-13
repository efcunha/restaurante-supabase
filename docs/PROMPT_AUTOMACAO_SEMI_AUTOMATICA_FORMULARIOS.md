# Prompt: Automacao Semi-Automatica Segura de Formularios

Objetivo
Criar um fluxo semi-automatico para manter formularios de UI alinhados entre design e codigo, com seguranca operacional, sem sobrescrever automaticamente trechos criticos.

Como usar
Cole o texto abaixo no Copilot Chat quando quiser executar a automacao assistida.

Texto do prompt

Atue como Desenvolvedor Full Stack Senior neste repositorio restaurante-supabase e implemente um fluxo semi-automatico seguro para evolucao de formularios.

Escopo do fluxo
1. Deteccao de mudancas em formularios
2. Checklist de seguranca e regressao
3. Geracao assistida de alteracoes de codigo
4. Preparacao de PR com evidencias
5. Sem sobrescrever automaticamente codigo critico

Regras obrigatorias
1. Nunca sobrescrever automaticamente arquivos de fluxo critico.
2. Sempre apresentar diff proposto antes de aplicar mudancas.
3. Exigir aprovacao humana para alteracoes em telas criticas.
4. Preservar isolamento multi-tenant e company_id nas partes de dados.
5. Nao alterar autenticacao, billing, RLS, CORS ou rate limiting sem gate explicito.
6. Nao hardcodar secrets.
7. Manter tipagem forte TypeScript e evitar any.

Fluxo esperado
1. Identificar os formularios-alvo no web e, quando aplicavel, no app.
2. Comparar estrutura atual com a mudanca desejada de design.
3. Gerar plano de alteracao por formulario contendo:
   - Campos adicionados
   - Campos removidos
   - Campos renomeados
   - Validacoes novas ou alteradas
   - Impacto de UX e acessibilidade
4. Gerar checklist obrigatorio antes de codar:
   - Impacto em fluxos criticos
   - Impacto em validacao de entrada
   - Impacto em i18n
   - Impacto em testes existentes
   - Impacto em seguranca e LGPD, quando houver PII
5. Propor alteracoes de codigo por arquivo com diff claro e pequeno.
6. Solicitar confirmacao humana para aplicar cada bloco sensivel.
7. Atualizar ou criar testes minimos necessarios.
8. Rodar validacoes locais relevantes.
9. Montar PR description com:
   - Contexto
   - Decisoes tecnicas
   - Riscos e mitigacoes
   - Evidencias de teste

Saida esperada do agente
1. Resumo executivo das mudancas
2. Lista de arquivos afetados
3. Diffs propostos por arquivo
4. Checklists preenchidos
5. Comandos de validacao executados e resultados
6. Rascunho de PR description em ingles

Gates de bloqueio
1. Se houver risco em auth, billing, RLS, CORS, rate limiting ou PII, parar e pedir confirmacao explicita.
2. Se houver incerteza de regra de negocio em fluxo critico, parar e pedir decisao.
3. Se um teste critico quebrar, nao prosseguir com merge readiness.

Definicao de pronto
1. Diffs revisados e aplicados com aprovacao
2. Testes relevantes passando
3. Sem regressao obvia em fluxo critico
4. Evidencias registradas
5. PR description pronta

Contexto adicional do repositorio
1. Priorizar padroes existentes em restaurante-web e manter paridade com restaurante-app quando aplicavel.
2. Usar componentes e tokens existentes em src/ui.
3. Evitar refactors amplos fora do escopo do formulario.
4. Em mudancas sensiveis, aplicar rollout com feature flag quando pertinente.

## Implementacao pratica no repositorio

O fluxo semi-automatico foi implementado no script abaixo:

- `scripts/form-automation/semi-auto-form-flow.mjs`

Documentacao e exemplo de entrada:

- `scripts/form-automation/README.md`
- `docs/forms/requests/change-request.example.json`
- `docs/forms/requests/approval.example.json`

### Comando recomendado (somente proposta de diff)

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

### Aplicacao controlada (nao sensivel)

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
   --change-file docs/forms/requests/change-request.example.json \
   --apply
```

### Aplicacao com aprovacao explicita para formulario critico

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
   --change-file docs/forms/requests/change-request.example.json \
   --apply \
   --approve-critical NovoPedidoScreen
```

### Aplicacao com aprovacao explicita para PII e area sensivel

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
   --change-file docs/forms/requests/change-request.example.json \
   --apply \
   --approve-pii RegisterCompanyScreen \
   --approve-sensitive RegisterCompanyScreen
```

### Aplicacao com arquivo formal de aprovacao humana (auditavel)

```bash
node scripts/form-automation/semi-auto-form-flow.mjs plan \
   --change-file docs/forms/requests/change-request.example.json \
   --apply \
   --approval-file docs/forms/requests/approval.example.json
```

### Artefatos gerados

Saida padrao: `tmp/form-automation/`

1. `form-change-summary.json`
2. `target-resolution.json`
3. `form-change-report.md`
4. `proposed-diffs/*.diff`
5. `security-gate.md`
6. `validation-results.json`
7. `pr-description-draft.md`
8. `approval-audit.json`
9. `pending-approvals.md`

### Observacoes de gate

1. Alteracoes em formulario critico exigem `--approve-critical <FormName>`.
2. Alteracoes com impacto PII exigem `--approve-pii <FormName>`.
3. Alteracoes com indicios de auth, billing, RLS, CORS ou rate limiting exigem `--approve-sensitive <FormName>`.
4. Em execucao auditavel, use `--approval-file` para registrar aprovador e trilha de aprovacao no artefato `approval-audit.json`.
5. O arquivo de aprovacao deve conter `approver` e `approvedAt` (ISO) para garantir auditabilidade minima.
6. Em modo `--apply`, bloqueios de gate encerram o comando com exit code `2` ate haver aprovacao humana.
7. Em modo `--strict-targets`, a execucao falha se algum formulario nao resolver arquivos alvo.
