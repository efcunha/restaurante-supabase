---
title: ADR-0005 - Implementação do Módulo de Agendamento de Mesas (Manual)
date: 2026-03-02
status: proposed
context: restaurante-web, restaurante-app, n8n
---

# ADR-0005 - Implementação do Módulo de Agendamento de Mesas (Manual)

## Contexto
O restaurante requer um sistema para registrar e gerenciar reservas de mesas (agendamentos). Após análise, optou-se por iniciar com o "Cenário B", onde o processo de atendimento ao cliente para reservas permanece manual (via telefone, balcão, WhatsApp direto com atendente), mas o registro e acompanhamento do fluxo da reserva passa a ser digitalizado dentro do ecossistema do restaurante.

Esse fluxo atende à premissa de que a operação interna necessita de uma visão centralizada para evitar *overbooking* e ter previsibilidade, enquanto o cliente final pode ser notificado passivamente via WhatsApp caso a reserva seja confirmada pelo gerente/admin.

## Decisão

Implementar um módulo centralizado de Agendamentos consistindo em:

1.  **Novo Modelo de Dados no Supabase:** Criação de uma tabela específica `agendamentos` com suporte a `status` (pendente, confirmada, cancelada, concluida, no-show) e `telefone_cliente` (essencial para as notificações WhatsApp).
2.  **Módulo Gerencial (restaurante-web):** Interface completa (CRUD) para que a gerência possa visualizar (lista/calendário), criar novas reservas recebidas via telefone/whats, aprovar, editar e cancelar.
3.  **Módulo Operacional (restaurante-app):** Tela focada apenas na execução do dia a dia, listando as reservas *confirmadas* da data atual, visando facilitar a recepção/hostess em dar o "check-in" (`status` = `concluida`).
4.  **Automação (n8n + Evolution API):** Gatilhos a partir de Webhooks configurados na tabela `agendamentos` no Supabase para enviar mensagens ativas de *Confirmação*, *Aviso de Recebimento* ou *Cancelamento* ao WhatsApp do cliente (quando fornecido).

## Opções Consideradas e Descartadas
- **Agendamento 100% via Bot (Cenário A):** Descartado neste momento para não adicionar complexidade inicial no atendimento via IA/Bot e focar em entregar valor à gerência interna primeiro. Pode ser acoplado no futuro usando a mesma tabela do Supabase.
- **Link Público Simplificado (Cenário C):** Descartado inicialmente pelo mesmo motivo do Cenário A, e para evitar spam de reservas sem contato primário com o restaurante. Poderá ser agregado à interface do `restaurante-web` posteriormente.

## Consequências

**Positivas:**
- Digitalização imediata de um processo até então não tabelado no sistema.
- A experiência do cliente melhora com notificações profissionais via WhatsApp sem envolver esforço manual de disparo por parte do restaurante.
- O App mobile da operação focará em uma visão tática ("O que tenho para hoje"), mantendo o design limpo e objetivo.

**Negativas/Riscos:**
- Qualquer instabilidade na comunicação entre Supabase Webhooks e N8N resultará na não emissão de avisos pelo WhatsApp (mitigado logando os avisos no n8n).
- A tabela `agendamentos` não cruza diretamente com o PDV de `pedidos` numa primeira fase, sendo tratada apenas como "estado de porta/mesa", e não faturamento.

## Plano de Execução Relacionado
As tarefas detalhadas encontram-se no artefato de plano de implementação.
