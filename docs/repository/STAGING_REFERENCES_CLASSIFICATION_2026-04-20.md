# Classificacao de Referencias a Staging (2026-04-20)

## Objetivo

Padronizar a interpretacao de referencias a `staging` na documentacao do monorepo, conforme a politica vigente: **nao existe ambiente de staging dedicado** e validacoes sensiveis devem ocorrer com **rollout guardado em producao**.

## Regra de Classificacao

- `operacional-ativa`: instrucao de execucao atual; deve refletir producao controlada.
- `roadmap-futuro`: referencia planejada/hipotetica; pode mencionar staging como possibilidade futura.
- `historico-evidencia`: registro de auditoria, post-mortem, triagem, ou evidencias passadas; nao deve ser tratado como runbook ativo.

## Resultado da Varredura

- Total de ocorrencias inspecionadas: 30
- Operacional ativa (alinhada): 8
- Operacional ativa (corrigida nesta rodada): 2
- Roadmap futuro: 1
- Historico/evidencia: 19

## Correcoes Aplicadas Nesta Rodada

1. `docs/LGPD/INCIDENT-RESPONSE-PLAN.md`

- Ajuste: "verify in staging first" -> "controlled production checks".
- Classe: operacional-ativa.

2. `docs/TEF-Balança/PR3_VALIDACAO_SMOKE_TESTING_2026-04-13.md`

- Ajustes: precondicoes, template de ambiente e gates migrados para canario em producao controlada.
- Classe: operacional-ativa.

3. `docs/saas-billing/mercadopago-edge-functions.md`

- Ajuste: isolamento de credenciais para `test/prod` (com nota para staging futuro).
- Classe: operacional-ativa.

4. `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`

- Ajuste de checklist legado para refletir validacao controlada em producao.
- Classe: historico-evidencia com trecho operacional reutilizavel.

## Arquivos Ja Alinhados na Rodada Anterior

- `docs/design-system/DOCUMENTATION_INDEX.md`
- `docs/design-system/MODERNIZATION_COMPLETE.md`
- `docs/design-system/NEXT_STEPS.md`
- `docs/design-system/DEPLOYMENT_GUIDE.md`

## Referencias que Permanecem por Serem Historicas ou de Contexto

- `docs/security/SECURITY_REMEDIATION_PLAN_2026-Q2.md`
- `docs/security/SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`
- `docs/security/SECURITY_DOCUMENTATION_INDEX.md`
- `docs/security/EXECUTIVE_SUMMARY_PT.md`
- `docs/security/SNYK_TRIAGE_2026-04-03.md`
- `docs/SDD.md`
- `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
- `docs/saas-billing/operations/ROADMAP-EXECUCAO-26MAR-TLDR.md`

## Criterio para Proximas Atualizacoes

Ao encontrar `staging` em documento novo:

1. Se for runbook/checklist operacional, reescrever para validacao controlada em producao.
2. Se for roadmap, manter com nota explicita de que staging ainda nao existe.
3. Se for historico/auditoria, manter como evidencia temporal.
