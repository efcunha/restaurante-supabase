# 01 - Arquitetura tecnica por camadas

## 1. Visao geral

A integracao de balanca sera organizada em cadeia de responsabilidade:

1. Balança fisica (serial/USB)
2. balanca-bridge (processo local Node.js)
3. API REST local em LAN
4. Hook de consumo no cliente (useBalanca)
5. Componente de exibicao (BalancaDisplay)
6. Integracao com fluxo de pedido (NovoPedidoScreen)
7. Persistencia no Supabase (item com peso)

Objetivo principal: permitir venda por peso com leitura assistida da balança, preservando seguranca, rastreabilidade e fallback operacional.

## 2. Dominios e responsabilidades

### 2.1 Bridge local

Responsavel por:

- Gerenciar conexao serial com a balanca.
- Normalizar leitura em payload HTTP.
- Expor endpoints de peso, status e tara.
- Tratar reconexao automatica e timeout de estabilidade.

Nao responsavel por:

- Persistir dados de pedido.
- Validar regra de negocio do POS.
- Acessar banco Supabase.

### 2.2 Cliente (app/web)

Responsavel por:

- Consumir API do bridge.
- Exibir estado de leitura (estavel/instavel/erro).
- Confirmar peso para compor item do pedido.
- Encerrar polling ao fechar fluxo de pesagem.

Nao responsavel por:

- Interpretar protocolo serial bruto.
- Armazenar segredo sensivel de infra.

### 2.3 Camada de dados

Responsavel por:

- Marcar produtos vendidos por peso.
- Persistir peso por item em pedidos.
- Persistir configuracao de bridge por empresa.
- Garantir isolamento por company_id + RLS.

## 3. Estrutura de projeto recomendada

### 3.1 Dominio no restaurante-web

- restaurante-web/src/features/balanca/components/
- restaurante-web/src/features/balanca/hooks/
- restaurante-web/src/features/balanca/services/
- restaurante-web/src/features/balanca/types/

### 3.2 Documentacao consolidada

- docs/balanca/README.md
- docs/balanca/01-arquitetura-tecnica-camadas.md
- docs/balanca/02-fluxos-tecnicos-desenvolvimento.md
- docs/balanca/03-contratos-api-bridge.md
- docs/balanca/04-dados-migracoes-rls.md
- docs/balanca/05-seguranca-lgpd-observabilidade.md
- docs/balanca/06-testes-rollout-rollback.md
- docs/balanca/PROMPT_INICIALIZACAO_PROJETO.md

## 4. Estados canonicos de leitura

Estados operacionais recomendados:

- not_initialized
- connecting
- ready
- reading
- stable
- unstable
- timeout
- unavailable
- error

O frontend deve exibir estes estados de forma clara ao operador, sem expor detalhes tecnicos sensiveis.

## 5. Integracao com pedido por peso

Fluxo de negocio alvo:

1. Produto marcado como vendido por peso.
2. Operador abre modal de pesagem.
3. Cliente recebe leitura atual e estabilidade.
4. Operador confirma peso estavel.
5. Sistema calcula valor: peso_kg x preco_por_kg.
6. Item e inserido no pedido com rastreabilidade de peso.

## 6. Limites de arquitetura

- Sem dependencia direta do cliente com porta serial.
- Sem acoplamento de regras de parser serial no frontend.
- Sem armazenamento de segredo de API em variaveis publicas.
- Sem bypass de company_id no acesso a configuracoes.

## 7. Decisoes de design

1. Bridge local isolado evita permissao serial no app/web.
2. Polling controlado simplifica compatibilidade multiplataforma.
3. Reconciliacao de erro orientada ao operador com fallback manual.
4. Evolucao por feature flag para reduzir risco em producao.
