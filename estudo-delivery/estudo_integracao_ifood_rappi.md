# Estudo de Integração: iFood, Rappi e Delivery Externo

Este arquivo guarda o contexto arquitetural e os passos necessários para a futura integração do nosso sistema com plataformas de delivery de terceiros (como iFood, Rappi, Aiqfome) e serviços de motoboy/logística.

## 1. O Conceito de Hub de Restaurante
Com a migração do motor de criação de entregas para a Web associado ao banco reativo, o sistema parou de ser apenas um "App de Anotar Pedido" para ser um Hub Central. 
Qualquer plataforma externa pode injetar pedidos diretamente no banco de dados e a interface da Cozinha/Caixa reage instantaneamente a eles, unificando a operação em uma única tela.

## 2. Inbound: Entrada de Pedidos (Externa ➡️ Nosso Sistema)
O caminho para receber um pedido do iFood e fazer ele aparecer na tela da sua Cozinha:

1. **Webhook do Parceiro:** O iFood dispara um Webhook padrão deles contendo os dados do cliente e os itens escolhidos.
2. **Recepção no n8n:** O n8n recebe esse payload, formata ele para o padrão da nossa tabela `orders` (calculando o preço total, parseando as strings de items, etc).
3. **Persistência Subapase:** O n8n faz um `INSERT API` direto no Supabase.
4. **Reação em Tempo Real:** Graças aos listeners do Supabase no nosso WebApp, a Cozinha e a tela Admin recebem o novo "card" do pedido na hora. A operadora nem precisa aceitar ou digitar nada.

## 3. Outbound: Gestão de Entregas e Status (Nosso Sistema ➡️ Externa)
O caminho inverso, para manter o cliente e as plataformas atualizados:

1. A operadora arrasta/clica no web-app para avançar o pedido para "Pronto" ou "Saiu para Entrega".
2. **Webhook do Supabase:** O banco, ao sofrer alteração (ex: `status_novo: entregue`), avisa o nosso webhook central no n8n.
3. **Ações Independentes no n8n:** Um Switch no n8n identifica a "origem" do pedido e toma ações específicas:
    - Faz um POST (HTTP Request) na API do iFood avisando a mudança de status.
    - Faz um POST (HTTP Request) na API de um app de logística (Lalamove, Delivery Direto, motoboys da casa) pedindo a coleta no restaurante.
    - Opcional: Aciona uma API do WhatsApp (ex: Evolution API / Z-api) para mandar mensagem automática pro número de telefone do cliente salvo na coluna `customer_phone`.

## 4. O que precisa ser feito no Banco de Dados no Futuro?
Para que toda essa engrenagem funcione perfeitamente, precisamos apenas criar dois campos novos na estrutura da tabela `orders` do Supabase quando chegar o momento:

1. **Adicionar a coluna `origem` (VARCHAR):**
   - **Por que?** Para identificar quem enviou. Valores sugeridos: `ifood`, `rappi`, `caixa_web`, `app_garcom`, `whatsapp`.
   - **Benefício na Tela:** O front-end da Web poderá ler o `origem = 'ifood'` e pintar o card de vermelho, por exemplo, facilitando visualmente a identificação pela equipe.

2. **Adicionar a coluna `external_id` (VARCHAR - opcional):**
   - **Por que?** Guardar o ID gigante/original gerado pelo iFood para aquele pedido específico. Quando o nosso garçom disser "saiu para entrega", o n8n precisa desse `external_id` para falar pro iFood exatamente qual pedido foi despachado.
