# Maquininha e Balanca - Integracao tecnica no restaurante-web

## Objetivo

Consolidar a especificacao tecnica de desenvolvimento da integracao de pagamento presencial (maquininha TEF) e leitura de balanca no restaurante-web, com Hyperswitch como camada de orquestracao entre PDV e adquirentes.

## Escopo desta documentacao

- Arquitetura tecnica e responsabilidades por camada
- Fluxos tecnicos de pagamento e reconciliacao
- Contratos tecnicos (request, response, estados e erros)
- Regras de seguranca, multi-tenant e LGPD
- Plano de testes, rollout e rollback
- Escopo atual de implementacao: `restaurante-web` + `restaurante-ops`

## Fora de escopo

- Implementacao de codigo frontend/backend
- Criacao de migration nesta etapa
- Publicacao de endpoint em producao nesta etapa
- Integracao no `restaurante-app` (mobile) nesta fase

## Indice

1. [Arquitetura tecnica](01-arquitetura-tecnica.md)
2. [Fluxos tecnicos de desenvolvimento](02-fluxos-tecnicos.md)
3. [Contratos, seguranca e observabilidade](03-contratos-seguranca-observabilidade.md)
4. [Plano de execucao, testes e rollout](04-plano-execucao-testes-rollout.md)
5. [Fluxo operacional PDV + balanca (discussao)](05-fluxo-operacional-pdv-balanca.md)
6. [Matriz de homologacao TEF + balanca](06-matriz-homologacao-tef-balanca.md)
7. [Deployment TEF-14/15](07-deployment-tef14-tef15.md)
8. [Runbook de ativacao TEF em producao (hoje)](08-runbook-ativacao-tef-producao-hoje.md)
9. [Checklist de monitoramento da primeira hora](09-checklist-monitoramento-primeira-hora-tef.md)
10. [Registro de ativacao TEF em producao (2026-04-10)](10-registro-ativacao-tef-2026-04-10.md)
11. [Encerramento executivo TEF (2026-04-10)](11-encerramento-executivo-tef-2026-04-10.md)
12. [Prompt de inicializacao do projeto](PROMPT_INICIALIZACAO_PROJETO.md)

## Premissas de negocio (fixas)

1. Cada restaurante possui contrato proprio com adquirente.
2. Credenciais de adquirente sao informadas no painel do SaaS.
3. SaaS cobra mensalidade fixa e nao participa do fluxo financeiro da transacao.
4. Hyperswitch sera operado pelo SaaS como gateway de roteamento.
5. Fluxo alvo e pagamento presencial (card present/TEF).

## Integracao com o projeto

- Dominio de feature reservado em restaurante-web/src/features/maquininha/
- Documentacao centralizada em docs/maquininha/
- Todas as futuras PRs da feature devem referenciar esta documentacao

## Prompts operacionais

- Prompt oficial de continuidade do estado atual: `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`
- Matriz oficial de homologacao: `06-matriz-homologacao-tef-balanca.md`
- `PROMPT_CONTINUACAO_MAQUININHA_2026-04-07.md` permanece apenas como registro historico de uma rodada anterior
- `PROMPT_INICIALIZACAO_PROJETO.md` deve ser usado apenas para bootstrap de iniciativa, nao como continuidade do estado atual

## Status rapido (2026-04-08)

- UX de maquininha simplificada no web e no app (mobile sem TEF, mantendo fluxo externo quando habilitado).
- Deploy do `restaurante-web` em producao concluido.
- Build Android `preview` do `restaurante-app` concluido para validacao funcional.
- Matriz inicial de homologacao TEF + balanca documentada com separacao entre simulador local, mock automatizado e integracao real controlada.
- Para progresso detalhado por fase, consultar `04-plano-execucao-testes-rollout.md`.
