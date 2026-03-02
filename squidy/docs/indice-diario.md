---
description: Registro base de apontamentos cronológicos.
---
# ÍNDICE DO DIÁRIO

O diretório `squidy/diario/` mantém o detalhamento das iterações dos agentes no projeto, servindo como uma memória longa e persistente, permitindo que qualquer revisão de contexto volte no tempo e veja *como* e *por que* algo foi construído e implementado, além do ADR.

## 📅 Arquivos de Diário

> Os arquivos de log são gerados mensalmente no formato `YYYY-MM.md`.

- [Março 2026](../diario/2026-03.md)

## 🔍 Busca Rápida

Ao buscar informações precisas no diário:

1. **Por Tipo de Entrada:** Busque por tags como `[DEBUG]`, `[REFACTOR]`, `[API PUSH]`, `[MCP VALIDATION]`.
2. **Por Tarefa (Kanban ID):** Ao ler no Kanban um card `[TASK-013]`, procure esse código nos arquivos de diário para descobrir quem a fez e quais foram as particularidades de sua solução.

---

## 📝 Como Registrar no Diário

1. Acesse o arquivo do mês e ano correntes em `squidy/diario/`.
2. Adicione uma divisão nova para o dia de hoje caso ela não exista (`## YYYY-MM-DD`).
3. Siga o formato abaixo rigorosamente:

```markdown
### HH:MM | `[TIPO-DA-ACAO]` [KANBAN-TASK-ID (Opcional)]
**Resumo:** O que você fez?
**Impacto:** Quais sistemas modificou (ex: "Apenas `restaurante-web` afetado").
**Próximo Passo:** Qual o próximo log ou a próxima tarefa prevista? 
```
