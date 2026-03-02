---
description: The main project knowledge base and context.
---
# Oracle

## Visão Geral

Este repositório/ecossistema serve como base para a gestão de restaurantes, composto por duas aplicações front-end principais que compartilham a mesma infraestrutura de backend e automações.

## Nossos Dois Projetos Frontend

1. **restaurante-web (React/Vite):**
   Focado na gestão gerencial e operacional. Inclui o módulo PDV (recém-migrado) para delivery e pedidos locais, Dashboard Financeiro e gerenciamento geral do salão. Deploy primário no Railway (SPA migrada da Vercel para evitar erros 404 dinâmicos).
   **Padrão de Interface / Dashboards Web:**
   Todas as telas web administrativas (como AdminScreen, ReservasScreen, MontagemScreen, DeliveryScreen) DEVEM compartilhar o seguinte padrão de estilização visual e UX para evitar quebra de design:
   - **Background Principal:** Cor areia/bege, código hexadecimal `#F5F5DC` em um View/SafeAreaView flexível base `{flex: 1}`.
   - **Cabeçalho (Header):** Topo trilateral estruturado horizontalmente (`flexDirection: 'row'`). Requer backgroundColor `#8B2F2F` (cor vinho do aplicativo), sombras multiplataforma (`boxShadow` no Web e `elevation`/`shadowColor` da API Shadow no Android/iOS) e contornos arredondados da base `borderBottomLeftRadius`/`borderBottomRightRadius: 20`.
   - **Composição do Header:** Esquerda exibindo Nome do Usuário (via provedor de auth); Centro trazendo Título da tela + Ícone visual; Direita posicionando o botão "Sair" / Logout.

2. **restaurante-app (Mobile - React Native/Expo):**
   Focado mais no uso do cliente ou operação simplificada (antes geria o delivery, que agora foi movido para web, mas suas responsabilidades como app em si são vitais). O ecossistema precisa garantir que o app nunca quebre quando o dashboard web for atualizado, pois ambos consomem a mesma base.

## Componentes Compartilhados (Backend / Integrações)

### Banco de Dados (Supabase)
PostgreSQL gerenciado pelo Supabase. Qualquer mudança de esquema ou função (RPC) afeta **web e app** simultaneamente.

- Principais tabelas: `pedidos`, `pagamentos`, `produtos`, `cardapio`, `agendamentos`. Todas usam isolamento através da coluna `company_id` vinculada ao RLS `profiles.company_id`.

### Webhooks e Automações

- **Evolution API:** Interface crítica para mensagens de WhatsApp, atuando em campanhas ou notificações em tempo real.
- **n8n:** O "cérebro" das integrações. Determina a lógica de direcionamento (ex: balcão vs delivery via Telegram) baseando-se em eventos lançados por qualquer um dos projetos front-ends.

## Histórico Recente de Implantações (Resumo)

- Refatoração de pedidos de delivery saindo do `restaurante-app` exclusivamente para o `restaurante-web` (criando módulo PDV).
- Unificação do fluxo de pedidos locais/delivery no n8n com evolução multi-inquilino.
- Configuração de Vercel e correções de layout/charts no `restaurante-web`.
- Migração do `restaurante-web` da Vercel para o Railway via Nixpacks + serve (garantindo roteamento SPA consistente sem 404).
- Introdução do fluxo manual de *Agendamento de Mesas*, compartilhando a tela `ReservasScreen` com suporte ao `company_id` nos apps Web/Mobile e envio dinâmico do nome da instância na integração com Evolution API.
