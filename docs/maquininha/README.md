# Maquininha - Integracao tecnica no restaurante-web

## Objetivo

Consolidar a especificacao tecnica de desenvolvimento da integracao de pagamento presencial (maquininha) no restaurante-web, com Hyperswitch como camada de orquestracao entre PDV e adquirentes.

## Escopo desta documentacao

- Arquitetura tecnica e responsabilidades por camada
- Fluxos tecnicos de pagamento e reconciliacao
- Contratos tecnicos (request, response, estados e erros)
- Regras de seguranca, multi-tenant e LGPD
- Plano de testes, rollout e rollback

## Fora de escopo

- Implementacao de codigo frontend/backend
- Criacao de migration nesta etapa
- Publicacao de endpoint em producao nesta etapa

## Indice

1. [Arquitetura tecnica](01-arquitetura-tecnica.md)
2. [Fluxos tecnicos de desenvolvimento](02-fluxos-tecnicos.md)
3. [Contratos, seguranca e observabilidade](03-contratos-seguranca-observabilidade.md)
4. [Plano de execucao, testes e rollout](04-plano-execucao-testes-rollout.md)
5. [Prompt de inicializacao do projeto](PROMPT_INICIALIZACAO_PROJETO.md)

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
