# 01 - Arquitetura tecnica

## 1. Visao geral

A integracao da maquininha sera organizada em arquitetura orientada a dominio, com separacao de responsabilidades por camada:

- Camada Web (restaurante-web): experiencia do operador de caixa e orquestracao de chamadas autenticadas.
- Camada Ops (restaurante-ops): API segura para iniciar pagamentos e consultar status.
- Camada Gateway (Hyperswitch): roteamento para adquirente configurado.
- Camada Dados (Supabase): configuracao de gateway por empresa e trilha imutavel de transacoes.

## 2. Objetivos tecnicos

- Isolamento multi-tenant por company_id em toda operacao.
- Idempotencia nos fluxos assincronos de status.
- Trilha de auditoria para conciliacao operacional e financeira.
- Tratamento consistente de estados de pagamento.
- Controle de rollout por feature flags.

## 3. Componentes e responsabilidades

### 3.1 restaurante-web

Responsavel por:

- Capturar dados operacionais para iniciar pagamento (comanda, valor, forma).
- Chamar endpoint seguro no restaurante-ops com token do usuario autenticado.
- Renderizar estados de execucao e retorno para operador.
- Registrar telemetria de UX e erros nao sensiveis.

Nao responsavel por:

- Persistir segredo de adquirente.
- Chamar adquirente diretamente.
- Executar regras de reconciliacao financeira.

### 3.2 restaurante-ops

Responsavel por:

- Validar autenticacao e autorizacao da requisicao.
- Resolver company_id da sessao autenticada.
- Buscar configuracao ativa de gateway da empresa.
- Encaminhar requisicao ao Hyperswitch.
- Persistir transacao inicial e atualizar estados por webhook.

### 3.3 Hyperswitch

Responsavel por:

- Receber solicitacao padronizada do SaaS.
- Roteamento para adquirente correto.
- Retornar estado inicial da cobranca.
- Enviar notificacoes de status assincronas.

### 3.4 Supabase

Responsavel por:

- Persistencia multi-tenant de configuracao do gateway.
- Persistencia imutavel de transacoes e historico de status.
- Politicas RLS por company_id para leituras/consultas de usuario.

## 4. Fronteiras de seguranca

### 4.1 Segredos

- api_key de adquirente nao pode ser armazenada em tabela aberta ao cliente.
- Segredos devem ficar em vault/ambiente seguro server-side.
- Nenhum segredo em variaveis EXPO_PUBLIC.

### 4.2 Dados sensiveis

- Nao armazenar PAN/CVV/dados brutos de cartao.
- Nao logar auth_code sem mascaramento.
- Nao retornar payload bruto do adquirente para UI.

### 4.3 Autorizacao

- Usuario deve estar autenticado.
- Permissao de processamento de pagamento deve ser validada.
- company_id deve ser derivado da identidade autenticada (nao confiar no body).

## 5. Estados canonicos de transacao

Estados internos recomendados:

- pending
- processing
- succeeded
- failed
- cancelled

Mapeamento de estados externos deve ser normalizado no backend para este conjunto canonico.

## 6. Estrutura alvo da feature no restaurante-web

Diretorio criado para evolucao gradual:

- restaurante-web/src/features/maquininha/components/
- restaurante-web/src/features/maquininha/hooks/
- restaurante-web/src/features/maquininha/services/
- restaurante-web/src/features/maquininha/types/

Nesta etapa, somente estrutura e documentacao.

## 7. Decisoes arquiteturais

1. Documentacao centralizada em docs/maquininha para evitar duplicidade app/web/ops.
2. Dominio reservado no restaurante-web para facilitar evolucao incremental por PRs.
3. Implementacao futura orientada por feature flag para rollout seguro.
4. Reconciliacao assincrona obrigatoria via webhook idempotente.
