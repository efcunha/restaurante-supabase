# ADR: Implementação do Módulo de Reservas de Mesa (Agendamento Manual)

## Status

Aceito

## Contexto
O restaurante necessita de um sistema para gerenciar reservas de mesas que são feitas manualmente (via telefone, balcão ou WhatsApp). Precisávamos de uma solução que atendesse tanto a gestão administrativa quanto os funcionários na operação (salão/recepção) de forma ágil, com possibilidade de enviar confirmações automáticas aos clientes.

## Decisão

Foi decidido implementar o módulo de **Agendamento Manual (Cenário B)** com as seguintes características:

1.  **Nova Tabela no Supabase (`agendamentos`)**
    - Criação da tabela com controle de `nome_cliente`, `telefone_cliente`, `data_hora_reserva`, `quantidade_pessoas`, `status`, `mesa_alocada` e `observacoes`.
    - Implementada segurança local através de RLS para apenas usuários autenticados (restaurante) manipularem esses dados.

2.  **Front-ends Compartilhados (Web e App)**
    - `restaurante-web` e `restaurante-app` receberam a tela `ReservasScreen`.
    - **Impacto Web**: Componentizado e adicionado ao Dashboard do Administrador/Gerente/Garçom para gerir todas as reservas com funcionalidades de Aprovar, Cancelar e Check-in.
    - **Impacto App**: Inserido na tab bar para uso ágil via dispositivo móvel por recepcionistas ou garçons, englobando a listagem em tempo real e a inserção de novas reservas.

3.  **Integração Automática via Supabase Webhooks e n8n**
    - Criação de um fluxo n8n para disparar notificações automáticas de *Confirmação/Cancelamento* de reservas via mensagem de WhatsApp usando a Integration da Evolution API.
    - Sempre que o campo `status` num agendamento mudo para `confirmada`, o gatilho aciona a notificação automaticamente se houver `telefone_cliente`.

## Alternativas Consideradas
- **Sistema SaaS Terceiro Exclusivo para Reservas**: Rejeitado pelo custo e pela necessidade de unificar o controle dentro do próprio ecossistema do restaurante (comandas, pedidos, fluxo de dados do Supabase).
- **Sem Aplicativo Mobile**: Rejeitado pois a regra de negócios solicitou que os operadores do salão no celular pudessem lançar reservas rapidamente ali mesmo via app.

## Consequências
- \*(Positivo)\* Centralização de todos os agendamentos permitindo visualizar o panorama diário.
- \*(Positivo)\* Notificação simplificada pro cliente e fidelização via WhatsApp.
- \*(Atenção)\* O n8n precisa estar corretamente autenticado com a Evolution API com a sessão válida no WhatsApp configurado para que o envio das mensagens de confirmação funcione de ponta a ponta.
