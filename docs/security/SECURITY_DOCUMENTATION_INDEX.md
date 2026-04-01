# Security Documentation Index

Data de consolidacao: 2026-04-01
Escopo: restaurante-app, restaurante-web, restaurante-ops

## Objetivo

Este arquivo e a porta de entrada unica da pasta de seguranca.

Se precisar entender status, plano e proximos passos, use esta ordem:

1. SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md
2. SECURITY_REMEDIATION_PLAN_2026-Q2.md
3. SECURITY_AUDIT_REPORT_2026-03-23.md

## Documentos Canonicos (fonte de verdade)

- SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md
Funcao: status vivo por semana, bloqueios e evidencias curtas.

- SECURITY_REMEDIATION_PLAN_2026-Q2.md
Funcao: plano mestre do trimestre, escopo por semana e criterios de aceite.

- SECURITY_AUDIT_REPORT_2026-03-23.md
Funcao: baseline tecnico da auditoria e riscos originais.

- LGPD_COMPLIANCE_GUIDE.md
Funcao: orientacao operacional de compliance.

- EXECUTIVE_SUMMARY_PT.md
Funcao: resumo executivo para lideranca.

## Regra de Consolidacao

Todo status e progresso ficam apenas em:
- SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md

Todo escopo e criterio de implementacao ficam apenas em:
- SECURITY_REMEDIATION_PLAN_2026-Q2.md

Arquivos de item isolado/snapshot foram consolidados e removidos para evitar fragmentacao.

## Politica de Consolidacao

- Nao criar novo arquivo de status quando o tema couber no semanal.
- Atualizar SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md para progresso e bloqueios.
- Atualizar SECURITY_REMEDIATION_PLAN_2026-Q2.md apenas quando houver mudanca de escopo.
- Criar snapshot apenas para marcos grandes (inicio/fim de fase), maximo 1 por semana.

## Estado Atual (resumo rapido)

- Semana 1: concluida
- Semana 2: gate de pinning pendente
- Semana 3: planejamento MFA e session fixation pronto
- Bloqueio estrutural: sem staging dedicado

## Navegacao rapida por necessidade

- Quero saber o que esta pendente agora:
SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md

- Quero entender o plano completo do ciclo:
SECURITY_REMEDIATION_PLAN_2026-Q2.md

- Quero contexto tecnico da auditoria inicial:
SECURITY_AUDIT_REPORT_2026-03-23.md

- Quero detalhes de um item especifico ja concluido:
usar a tabela da semana correspondente em SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md.
