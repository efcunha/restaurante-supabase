# Estudo de Implementação: Delivery e Integração (Web e App)

## 1. Visão Geral e Estratégia de Separação

Este estudo detalha a implementação do módulo **Delivery (Integração com iFood, Rappi, Aiqfome e Gestão de Entregas)**, dividindo as responsabilidades de interface e operação entre os dois projetos principais:
- **`restaurante-web` (Gestão Central):** Concentrará a operação pesada de delivery (configuração de integrações, gestão de frota/entregadores, despacho de pedidos, visualização em painel/kanban).
- **`restaurante-app` (Acompanhamento e Operação de Chão):** Focará no acompanhamento rápido de balcão e expedição (notificações de novos pedidos, verificação de status, e potencial interface para entregadores confirmarem coleta/entrega).
- **Supabase (Backend Integrador):** O núcleo da inteligência de integração (comunicação com as APIs do iFood/Rappi/Aiqfome) não ficará no front-end, mas sim em **Edge Functions** do Supabase, garantindo segurança (chaves de API ocultas) e alta disponibilidade (webhooks 24/7).

---

## 2. Arquitetura do Backend (Supabase Edge Functions)

Como plataformas como o iFood trabalham ativamente enviando atualizações para o restaurante (Webhooks) e os aplicativos (Web/Mobile) não ficam abertos 100% do tempo (e não devem expor chaves de API), teremos a seguinte arquitetura:

1. **`delivery-webhook` (Edge Function):**
   - Rota pública autenticada pelas plataformas (iFood, Rappi, Aiqfome).
   - Recebe eventos de `order.placed` (novo pedido) ou `order.cancelled` (cancelamento).
   - Converte o payload da plataforma para o formato nativo da tabela `orders` do restaurante.
   - Insere no banco com `order_source = 'ifood'` e aciona o **Realtime** (notificando o Web e o App simultaneamente).
2. **`delivery-sync` (Edge Function):**
   - Sempre que um pedido for avançado no sistema (ex: de "Preparando" para "Pronto", ou "Saiu para Entrega" no `restaurante-web`), uma Trigger no Supabase chama essa Edge Function.
   - A Function envia a atualização para a API da plataforma de origem (iFood/Rappi/Aiqfome), mudando o status lá também para o cliente final.

### Mudanças no Banco de Dados (Migrations Necessárias):
- **Tabela `orders`:** Adicionar colunas `order_source` (enum: local, ifood, rappi, aiqfome), `external_order_id` (ID na plataforma), `delivery_address` (JSONB) e `delivery_fee`.
- **Nova Tabela `entregadores`:** Para CRUD de motoristas da casa (`id`, `nome`, `telefone`, `veiculo`, `company_id`).
- **Nova Tabela `delivery_configs`:** Para guardar chaves `client_id` e `client_secret` ou tokens de integração por Empresa (já que é um modelo SaaS/Multi-tenant).

---

## 3. Implementação no `restaurante-web` (Gestão de Delivery)

O painel Web, rodando em telas maiores (PCs, Tablets), é ideal para o **Despacho** e a **Gestão**.

### Telas e Componentes a Desenvolver:
1. **Dashboard de Delivery (Painel Principal):**
   - **Visão:** Lista dividida por colunas (Kanban) ou Tabela dinâmica (Pendentes, Preparando, Prontos para Entrega, Em Rota).
   - **Ações:** Aceitar pedido (envia confirmação pro iFood via Edge Function), Imprimir Comanda de Entrega (contendo endereço e fita), e "Despachar".
2. **Modal de Despacho (`DispatchOrderModal.tsx`):**
   - Ao clicar em "Despachar" (Saiu para entrega), abre um modal listando os entregadores ativos (da tabela `entregadores`).
   - O gerente seleciona o entregador, atribuindo-o ao pedido (`delivery_person_id`).
3. **Gestão de Entregadores (`GerenciarEntregadoresScreen.tsx`):**
   - Tela de CRUD simples: Adicionar, inativar, editar dados dos entregadores próprios do restaurante.
4. **Configurações de Integração (`DeliveryConfigScreen.tsx`):**
   - Interface (somente Admin) para inserir credenciais (Client ID, Client Secret, Merchant ID, ou Tokens de Integração) das plataformas (iFood, Rappi, Aiqfome) e gerar a URL de Webhook para colocar no portal de parceiros.

---

## 4. Implementação no `restaurante-app` (Acompanhamento e Mobilidade)

Para o Mobile, o objetivo é agilidade e notificação táctil, sem poluir a interface primária de lançamento de comandas locais.

### Telas e Funcionalidades a Desenvolver:
1. **Aba de "Expedição/Monitor Delivery" (`DeliveryMonitorScreen.tsx`):**
   - Focado apenas em pedidos `status = "ready"` que aguardam retirada.
   - Mostra qual entregador vai levar qual pacote.
   - Permite que o operador da "boca do fogão" dê um "Check" de que a sacola foi entregue ao motoboy (mudando status para `dispatched`).
2. **Notificações Push / Sonoras:**
   - Como o celular fica no bolso da equipe ou na bancada, implementar um componente oculto que escuta a tabela `orders` via Supabase Realtime para a `company_id` atual onde `order_source IN ('ifood', 'rappi', 'aiqfome')`.
   - Causa uma vibração ou som na chegada de um "Novo Pedido de Delivery".
3. **(Opcional / Expansão Futura) Perfil Entregador:**
   - Se um usuário fizer login no `restaurante-app` com o Role `entregador`, ele cai não na visão de Caixa, mas numa tela única com **"Minhas Entregas do Dia"**, onde vê o endereço e tem botão "Confirmei Entrega no Cliente", que encerra o ciclo automaticamente.

---

## 5. Plano de Ação e Esforço (Roadmap Específico Tático)

| Fase | Projeto Alvo | Tarefa | Risco/Complexidade |
| :--- | :--- | :--- | :--- |
| **1. Banco e Backend** | Supabase | Criar migrations (`order_source`, tabela `entregadores`). Deploy da Edge Function dummy de Webhook. | Alta (requer muito teste isolado de API com Postman) |
| **2. Painel Web** | `restaurante-web` | Criar `DeliveryDashboard`, `GerenciarEntregadores` e `DeliveryConfig`. | Média (uso de componentes já existentes de tabelas) |
| **3. Integração** | Supabase / Web | Conectar o Webhook Real com a criação de pedidos. Web ouve o Realtime e plota o card na tela. | Alta (Mapeamento JSON iFood -> Orders) |
| **4. App Mobile** | `restaurante-app` | Criar tela leve de Monitor/Acompanhamento. Adicionar Listener de Realtime com som de campainha. | Baixa (reuso de lógicas de listagem atuais do app) |

### Recomendações Críticas:
- **Testes com Mock / Sandbox:** Não testar direto com a API real de restaurante live. A maioria das plataformas (como o iFood e o Aiqfome) possui credenciais de Sandbox/Developer para enviar "Pedidos Falsos" à Edge Function de vocês.
- **Isolamento de Estado:** Garantir que erros de "timeout" com a API de Integração na sincronização de status não travem o App (por isso toda a camada pesada HTTP-calls viverá nas Functions).
