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
