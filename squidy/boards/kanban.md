---
description: Kanban board for tasks
---
# Kanban

## TODO
- Documentar arquitetura do web app e supabase
- Mapear integrações ativas (WhatsApp, N8N)

### 🚧 DOING (Em Andamento)
- [UI/UX] Implementar tela de Reserva no Web com Status de abas.

### ✅ DONE (Concluído)
- [Bugfix] Pedidos de Delivery marcados como "Montados" não aparecem na tela de Entrega.
- [Bugfix] Correção na exibição de quantidades nos testes e fluxo de Caixa/Cozinha (Web e App): Os itens repetidos agora são agrupados visualmente nas telas `CozinhaScreen` e `MontagemScreen` para evitar múltiplas linhas de "1x" em ambos os apps. O erro de *timeout* nos testes E2E do web foi resolvido excluindo o script obsoleto e o fluxo foi normalizado.
- [Arquitetura/Segurança] Implementada trava definitiva com Unique Index Parcial no banco do Supabase para impedir Race Conditions durante a criação simultânea de comandas (Erro 406 de single limit), apoiada por fallback defensivo (Código de constraint 23505) direto nos arquivos `ComandasService` do `restaurante-web` e `restaurante-app`.
- [Bugfix] Removido o campo `price_map` do payload de inserção/atualização na tabela `orders` no serviço SupabaseOrderService.ts, prevenindo que o app lance o erro 400 (PGRST204) na API do Supabase durante a listagem e finalização de Pedido Delivery.
- [QA] Criar testes E2E com Playwright para as telas de Mapa de Mesas e Novo Pedido Delivery.
- [QA] Criar testes E2E com Playwright para a tela de Novo Pedido (itens simples e fluxo de Pizza).
- [QA] Implementar configuração e primeiro teste E2E usando Playwright no projeto restaurante-web.
- [x] BUGFIX: Corrigir discrepância de quantidades na Cozinha e Montagem (Web e App) + Agrupamento por Mesa ✅
- [Bugfix] Descoberta e correção da discrepância de valores em comandas (Web e App): o hook `useComandaManagement.js` recalculava incorretamente totais usando apenas itens simples do cardápio e apagava o valor de Pizzas compostas do banco. Códigos fortificados e comanda afetada corrigida via SQL.
- [UI/UX] Padronizar layout de cores dos itens no Pedido Delivery do Web para refletir a nova interface do Novo Pedido.
- [UI/UX] Analisar e padronizar layout de cores na tela de Novo Pedido (Web e App) para melhorar a experiência do usuário.
- [UI/UX] Implementar tela de Reserva no Web.
- [UI/UX] Correção de Alinhamento na Tela Novo Pedido: Centralização e espaçamento condizente em `NovoPedidoScreen.tsx` e componentes relacionados.
- [UI/UX] Padronização do layout de cores dos itens no Pedido Delivery do Web para refletir a nova interface do Novo Pedido.
- [Feature] Sincronização de Layout da Tela Novo Pedido: Os itens na tela de novo pedido (App e Web) foram ajustados para que a listagem tenha alinhamento consistente, espaçamentos padronizados e interface mais amigável.
- [Feature] Sincronização de Layout da Tela de Reservas e Adição de filtros de Status na tela de *Reservas* (`restaurante-app`). Atualização dos cards na tela *Novo Pedido* (`restaurante-web`) espelhando detalhes visuais premium do App.
- **[Feature] Implementação do Módulo de Agendamento Manual de Reservas**: Gerenciamento no painel web, painel mobile, e notificação no n8n.
- **[Deploy] Migração completa do `restaurante-web` da Vercel para o Railway (incluída configuração nativa para SPA previnindo erro 404)**.
- Completar estrutura do Squidy manualmente (readme-agent, AGENT, poliíticas e contexto da sessão)
- Configurar ambiente de desenvolvimento
- Inicialização manual do Squidy
- **[Feature] Implementação do Módulo de Agendamento Manual de Reservas**: Criação da tabela `agendamentos` no Supabase, interfaces no web e app para criar, listar e dar check-in em clientes. Atualização das roles.
- **[Feature] Notificação de Reserva n8n**: Webhooks conectados da tabela do Supabase pro n8n pra mandar mensagem Evolution. Squidy
- Correção de geração do QRCode do WhatsApp (Evolution API)
- Corrigir erro 404 no Vercel (restaurante-web)
