---
description: The main project knowledge base and context.
---
# Oracle

## Visão Geral
Este repositório/ecossistema serve como base para a gestão de restaurantes, composto por duas aplicações front-end principais que compartilham a mesma infraestrutura de backend e automações.

## Nossos Dois Projetos Frontend
1. **restaurante-web (React/Vite):** 
   Focado na gestão gerencial e operacional. Inclui o módulo PDV (recém-migrado) para delivery e pedidos locais, Dashboard Financeiro e gerenciamento geral do salão. Deploy primário na Vercel.
2. **restaurante-app (Mobile - React Native/Expo):** 
   Focado mais no uso do cliente ou operação simplificada (antes geria o delivery, que agora foi movido para web, mas suas responsabilidades como app em si são vitais). O ecossistema precisa garantir que o app nunca quebre quando o dashboard web for atualizado, pois ambos consomem a mesma base.

## Componentes Compartilhados (Backend / Integrações)
### Banco de Dados (Supabase)
PostgreSQL gerenciado pelo Supabase. Qualquer mudança de esquema ou função (RPC) afeta **web e app** simultaneamente.
- Principais tabelas: `pedidos`, `pagamentos`, `produtos`, `cardapio`.

### Webhooks e Automações
- **Evolution API:** Interface crítica para mensagens de WhatsApp, atuando em campanhas ou notificações em tempo real.
- **n8n:** O "cérebro" das integrações. Determina a lógica de direcionamento (ex: balcão vs delivery via Telegram) baseando-se em eventos lançados por qualquer um dos projetos front-ends.

## Histórico Recente de Implantações (Resumo)
- Refatoração de pedidos de delivery saindo do `restaurante-app` exclusivamente para o `restaurante-web` (criando módulo PDV).
- Unificação do fluxo de pedidos locais/delivery no n8n.
- Configuração de Vercel e correções de layout/charts no `restaurante-web`.
