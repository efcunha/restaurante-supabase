---
description: Políticas e padrões do projeto (Git, Review, Testes, Deploy).
---
# POLÍTICAS

Estas regras garantem que a qualidade e estabilidade do repositório `restaurante-supabase` permaneçam íntegras à medida que agentes e desenvolvedores colaboram. Nunca as viole.

## 🔧 Políticas de Desenvolvimento

### Commits e Versionamento
- **Conventional Commits:** Utilize sempre o padrão Conventional Commits (ex: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **Referências a Tarefas:** Inclua o ID da tarefa (baseado no Kanban) no corpo ou rodapé do commit se houver.
- **Micro-Commits:** Realize commits pequenos e lógicos. Evite "juntar" dezenas de mudanças em um único commit monolítico.

### Qualidade e Code Review
- **Revisão Obrigatória:** Agentes devem gerar Planos de Implementação (Implementation Plans) antes de saírem alterando múltiplos arquivos críticos do banco (Supabase) ou frontend web/app.
- **Tipagem Estrita:** Novos códigos em JS/TS devem ter preferência por anotações de tipo ou validações strict sempre que o framework primário permitir.

### Testes
- **Nível Mínimo:** Se uma nova regra for injetada em um Webhook ou RPC Postgres, um rápido plano de testes de impacto entre os dois apps (web e mobile) deve ser simulado no diário da sessão.

## 📦 Políticas de Interface Externa

### Ecossistema Web + Mobile
- **Compatibilidade Retroativa:** Nunca quebre um contrato de API do Supabase que faria o aplicativo iOS/Android já distribuído aos usuários dar *crash* imediato por conflito de Schema.

### Integrações (n8n e WhatsApp)
- **Alterações de Fluxo:** Qualquer mudança de estrutura JSON entre n8n e sua Evolution API deve ser previamente documentada (preferencialmente com ADR ou registro de mudança de versão).

## 🔒 Políticas de Segurança

- Nunca grave chaves de API cruas nos logs, Kanban ou Diários do Agente.
- Use as instâncias de MCP (*Model Context Protocol*) para lidar com validações no Supabase e n8n quando for ler estruturas privadas em vez de pedir chaves em plaintext ao operador do chat.
