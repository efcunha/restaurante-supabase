---
description: Project Constitution and rules
---
# Constitution

## Objetivo do Projeto
O ecossistema `restaurante-supabase` engloba dois projetos interdependentes:
1. **restaurante-web:** A aplicação web (gerenciamento, PDV, painel financeiro, pedidos de delivery/balcão).
2. **restaurante-app:** O aplicativo móvel para os clientes e/ou operação interna.
Ambos são interligados e integrados ao **Supabase** (banco de dados/autenticação), utilizando integrações externas ativas com o **n8n** (automações e roteamento) e a **Evolution API** (mensageria via WhatsApp e Telegram). O foco principal é não quebrar contratos de dados entre essas duas plataformas.

## Diretrizes do Agente Antigravity (Eu)
- Sempre responder em português do Brasil (`pt-br`), conforme a regra global do usuário.
- **Consciência de Múltiplos Projetos:** Ao realizar qualquer mudança no Supabase, serviços de API, rotas ou tipos de dados compartilhados, SEMPRE analisar o impacto tanto no `restaurante-web` quanto no `restaurante-app`. O código e o modelo de dados devem permanecer compatíveis para ambos.
- Antes de iniciar modificações na arquitetura, consultar as decisões registradas nos ADRs (`squidy/adrs/`).
- Atualizar o quadro Kanban (`squidy/boards/kanban.md`) ao iniciar, concluir ou mudar o estado de uma tarefa importante, especificando claramente qual(is) projeto(s) a tarefa impacta.
- Documentar qualquer alteração estrutural criando um ADR em `squidy/adrs/`.

## O que NUNCA fazer
- Alterar o banco de dados (Supabase) ou fluxos de integração (n8n/WhatsApp) pensando apenas em um lado da aplicação (ex: focar apenas no web e quebrar o app).
- Modificar dependências estruturais sem antes gerar e obter validação via ADR.
- Esquecer de atualizar o `Oracle.md` quando as premissas de integração principal forem alteradas.
