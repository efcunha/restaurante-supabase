# Guia de Acesso: iFood API para Desenvolvedores (Ambiente de Testes)

Para desenvolver e testar a integração do Supabase com o iFood (recebimento de pedidos, atualização de status e catálogos), é necessário criar uma conta no Portal do Desenvolvedor do iFood e configurar um aplicativo em ambiente Sandbox (Testes). 

Este ambiente permite que você simule a criação de pedidos falsos para sua Edge Function sem afetar um restaurante real em produção.

Abaixo está o passo a passo completo atualizado para as políticas mais recentes (API V1/V2) do iFood.

---

## 1. Criar uma Conta no Portal do Desenvolvedor

A API do iFood mudou e agora existe um portal unificado e bem documentado chamado **iFood Developer**.

1. Acesse o portal: [https://developer.ifood.com.br/](https://developer.ifood.com.br/)
2. No canto superior direito, clique em **"Acessar o portal"**.
3. Você será redirecionado para a tela de login. Como você ainda não tem conta, escolha a opção de **"Cadastrar-se"** (pode usar um e-mail do Google, GitHub ou criar direto com o iFood).
4. O iFood pedirá alguns dados sobre a sua "Empresa/Desenvolvedora". Você pode preencher com os dados do projeto do Restaurante. Eles perguntarão "Qual o seu modelo de integração?", escolha algo como **"Software House"** ou **"Sistema de PDV"**.

---

## 2. Criar um Aplicativo (App)

Uma vez dentro do portal logado, você precisa criar as credenciais que o Supabase vai usar para falar com o iFood.

1. No menu lateral ou painel central, procure pela seção **"Meus Apps"** ou **"Aplicativos"** e clique em **"Criar novo App"**.
2. Preencha os dados:
   - **Nome do App:** `Restaurante Supabase PDV`
   - **Tipo do App:** `Integração de PDV` / `Gestão de Pedidos`
   - **Segmento:** `Restaurantes`
3. Configure os **Escopos** que o seu App precisa acessar. Você precisará permitir acesso ao menos aos seguintes escopos (scopes):
   - `order.read` (Ler detalhes do pedido)
   - `order.write` (Atualizar status de pedido)
   - `merchant.read` (Ler dados do restaurante)
   - *Opcional futuramente:* `catalog.read` e `catalog.write` (Se quiser que o Supabase atualize o cardápio no iFood).

### Salvando as Credenciais
Após criar o App, o iFood gerará duas informações críticas:
- **Client ID** (ID do Cliente)
- **Client Secret** (Segredo do Cliente)

> **⚠️ IMPORTANTE:** Copie o `Client Secret` imediatamente e guarde em um bloco de notas seguro (ou direto no `.env` local do Supabase). O iFood não mostrará esse Segredo novamente. Se perder, terá que gerar um novo.

---

## 3. Vincular um Restaurante de Teste (Test Merchant)

Você tem um "App", mas um App precisa estar conectado a uma "Loja" para receber pedidos. Vamos criar uma loja falsa.

1. No portal do desenvolvedor, procure a seção de **"Test Merchant"**, **"Restaurantes de Teste"** ou **"Ferramentas de Teste"**.
2. Clique em **"Criar Restaurante de Teste"**.
3. O sistema gerará um restaurante automatizado (ex: *Test Burger 234*) com um **Merchant ID** (UUID da loja). Anote esse ID.
4. Vá até as configurações do seu **App** (criado no Passo 2) e procure pela área de "Autorizações" ou "Vínculos de Lojas". Adicione o **Merchant ID** da sua loja de teste para autorizar o seu Client ID a manipular essa loja específica.

---

## 4. Configurar a Edge Function para o Webhook

O iFood precisa saber *onde* avisar quando um pedido falso de teste chegar.

1. No Portal do Desenvolvedor, vá aos detalhes do seu App e procure a aba **"Webhooks"** ou **"Eventos"**.
2. Clique em **"Configurar Webhook"**.
3. Você precisará fornecer uma **URL HTTPS pública** válida. Como você usará o Supabase Edge Functions, a URL será algo como:
   `https://[SEU_PROJETO_REF].supabase.co/functions/v1/delivery-webhook`
4. Selecione os eventos que você quer ouvir (basicamente marque `order.placed`, `order.cancelled`, etc).
5. Salve. Se o iFood tentar validar a URL na hora, garanta que no painel do Supabase a sua Edge Function consiga retornar `HTTP 200 OK` (mesmo para webhooks em branco momentaneamente).

> **Dica para Testes Locais:** Antes do deploy final para a nuvem do Supabase, você pode usar ferramentas como **Ngrok** (`ngrok http 54321`) que criam um link público `.ngrok-free.app` que repassa o chamado do iFood pro seu `supabase functions serve` local rodando na sua máquina.

---

## 5. Ferramenta de Simulação (Simulador do iFood)

Como emitir um pedido falso se o restaurante não existe no App real do iFood pro cliente?

O Portal do Desenvolvedor do iFood possui uma ferramenta nativa de simulação:
1. Vá na aba **"Simulador de Pedidos"** ou **"Mock de Pedidos"** no portal.
2. Selecione a Loja de Teste vinculada.
3. Clique em **"Gerar Novo Pedido de Teste"** e escolha o status inicial (`PLACED`).
4. Ao clicar nesse botão, o iFood fará um POST na URL de Webhook da sua Edge Function.
5. Você poderá ver os logs no Log Explorer do Supabase (ou no seu terminal se estiver usando ngrok). 

---

## Resumo das Variáveis Necessárias para as Edge Functions

Com o passo a passo concluído, guarde essas 3 variáveis para a implementação técnica no Supabase:

1. `IFOOD_CLIENT_ID` = (Do Portal Dev - App)
2. `IFOOD_CLIENT_SECRET` = (Do Portal Dev - App)
3. `IFOOD_TEST_MERCHANT_ID` = (Do Portal Dev - Loja Mockada)
