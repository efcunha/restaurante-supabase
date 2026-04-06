# Balanca - Documentacao tecnica consolidada

## Objetivo

Documentar tecnicamente a integracao de leitura de peso por balanca serial/USB no ecossistema restaurante-supabase, com foco em desenvolvimento seguro e rollout controlado.

## Escopo desta documentacao

- Arquitetura por camadas (bridge, hook, UI, fluxo de pedido, dados)
- Fluxos tecnicos de leitura, confirmacao e fallback
- Contratos de API do bridge e mapeamento de erros
- Estrategia de dados, migracoes e RLS
- Seguranca, LGPD e observabilidade
- Testes, rollout, rollback e criterios de aceite
- Prompt operacional para iniciar o projeto em outro dia

## Fora de escopo

- Implementacao de codigo nesta etapa
- Execucao de setup/configuracoes
- Execucao de migracoes
- Deploy

## Mapa de documentos

1. [Arquitetura tecnica por camadas](01-arquitetura-tecnica-camadas.md)
2. [Fluxos tecnicos de desenvolvimento](02-fluxos-tecnicos-desenvolvimento.md)
3. [Contratos API do balanca-bridge](03-contratos-api-bridge.md)
4. [Dados, migracoes e RLS](04-dados-migracoes-rls.md)
5. [Seguranca, LGPD e observabilidade](05-seguranca-lgpd-observabilidade.md)
6. [Testes, rollout e rollback](06-testes-rollout-rollback.md)
7. [Prompt de inicializacao do projeto](PROMPT_INICIALIZACAO_PROJETO.md)

## Referencia fonte

Documento base analisado:

- ../BALANCA_IMPL_PROMPT.md

## Diretriz de uso

Cada PR futuro da feature balanca deve referenciar pelo menos um documento desta pasta para manter rastreabilidade tecnica e aderencia aos guardrails do monorepo.
