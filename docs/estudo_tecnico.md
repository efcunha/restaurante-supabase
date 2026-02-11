# Estudo Técnico: Implementação de Delivery, Gestão Fiscal e Venda por Peso

## 1. Introdução e Contexto
O objetivo deste estudo é analisar a viabilidade e definir a melhor abordagem técnica para incorporar três grandes módulos ao sistema "Restaurante Supabase": **Delivery**, **Gestão Fiscal** e **Venda por Peso**.
Atualmente, o projeto consiste em um aplicativo móvel (React Native/Expo) integrado ao Supabase. Existe uma preocupação válida sobre a sobrecarga do aplicativo móvel ("App muito pesado") e a complexidade de manter integrações de terceiros diretamente no cliente (celular do usuário).

**Conclusão Inicial:** A intuição de não implementar tudo no Mobile está correta. Funcionalidades como integração com iFood e Emissão Fiscal dependem de comunicação estável, chaves de API secretas e webhooks que não devem rodar em um dispositivo móvel instável.
Recomenda-se uma arquitetura **Híbrida**, onde o App Mobile serve como "Controle", mas o processamento pesado fica no **Backend**.

---

## 2. Análise do Projeto Atual

### 2.1 Tecnologias Identificadas
- **Frontend/Mobile:** React Native com Expo (SDK 54), TypeScript.
- **Backend/Database:** Supabase (PostgreSQL, Auth, Realtime).
- **Serviços Principais:** 
  - `OrderService.ts`: Gerencia regras de negócio de pedidos.
  - `PagamentosService.ts`: Registra pagamentos e atualiza comandas.
  - `PrinterService.ts`: Já existe suporte a impressoras térmicas (importante para Delivery e Fiscal).

### 2.2 O que já existe (e pode ser aproveitado)
- **Estrutura de Pedidos (`OrderService`):** O sistema já possui um fluxo de status (`preparing`, `ready`, `delivered`). Isso pode ser expandido para o Delivery adicionando status como `dispatched` (saiu para entrega).
- **Impressão (`PrinterService`):** A lógica de comunicação com impressoras já existe, facilitando a impressão de vias de entrega e DANFE (NFC-e).
- **Cadastro de Produtos:** Já suporta categorias e preços, mas precisará de campos extras para integração com iFood (ex: códigos PDV externos) e Balança (flag "vendido por peso").

### 2.3 O que falta (Lacunas)
- **Delivery:** Não há campos para Endereço, Telefone, Taxa de Entrega ou Origem do Pedido (iFood/App/Telefone) na tabela `orders`.
- **Fiscal:** `PagamentosService` apenas registra valores. Não há lógica de tributação (NCM, CFOP, Alíquotas) nem comunicação com SEFAZ.
- **Balança:** Não há integração com hardware de pesagem nem leitura de etiquetas de automação.

---

## 3. Abordagem Recomendada por Módulo

### Módulo 1: Vendas com Delivery (Pontos 1 a 9)

**Desafio:** O iFood e outros apps funcionam via "Polling" (consultar pedidos a cada 30s) ou "Webhooks" (o iFood avisa quando tem pedido). Manter o App Mobile "ouvindo" o iFood é inviável (bateria, app em segundo plano morre).

**Solução Arquitetural:**
Criar um **Integrador Backend** (ver seção 4).

1.  **Vendas do tipo "Delivery" & Integração (iFood/99):**
    *   O Backend consulta ou recebe do iFood. Ao identificar um pedido, insere no Supabase.
    *   O App Mobile, que já usa Supabase Realtime, receberá o pedido automaticamente na tela de "Novos Pedidos" ou uma nova aba "Delivery".
    *   *Ajuste no Projeto:* Adicionar coluna `order_source` (iFood, Local, Whatsapp) e `delivery_info` (JSON com endereço) na tabela `orders`.

2.  **Cardápio Digital:**
    *   Não faça isso dentro do App Mobile de gestão. Crie uma **Web Page** simples (Next.js ou React) que lê do mesmo Supabase. Cliente acessa pelo navegador, faz o pedido, e cai direto no Supabase.

3.  **Fluxo de Status e Entregador:**
    *   *Ajuste no Projeto:* Criar tabela `entregadores`.
    *   No App Mobile, ao finalizar um pedido Delivery, o operador seleciona o entregador.
    *   O Backend atualiza o status no iFood automaticamente (via Trigger do Supabase).

**Resumo da Implementação Delivery:**
*   **Backend:** Serviço de Polling iFood -> Insere no Supabase.
*   **Mobile:** Tela para visualizar pedidos com endereço + Botão "Despachar" (selecionar motoboy).

---

### Módulo 2: Gestão Fiscal (NFC-e / NF-e)

**Desafio:** A legislação brasileira é complexa. Implementar assinatura XML, comunicação SOAP com SEFAZ e tratamento de erros no Mobile é extremamente custoso e propenso a falhas.

**Solução Recomendada:** **API de Intermediação Fiscal.**
Contratar um serviço como **eNotas**, **Focus NFe**, **WebmaniBR** ou **Nuvar**. Eles fornecem uma API JSON simples: você envia "Venda de R$ 50,00" e eles devolvem "Autorizado" + URL do PDF.

**Fluxo Sugerido:**
1.  **No App Mobile:** Ao fechar a conta (`PagamentosService`), perguntar "CPF na Nota?".
2.  **Ação:** O App chama uma Supabase Edge Function `emitir-nfce`.
3.  **Processamento:** A Function chama a API Fiscal (ex: Focus NFe).
4.  **Retorno:** A API devolve o link do PDF/QRCode.
5.  **Impressão:** O App Mobile recebe o link e manda para o `PrinterService` imprimir o QRCode no rodapé do cupom.

---

### Módulo 3: Balanças e Venda por Peso

**Cenário:** Existem duas formas de trabalhar com peso em restaurantes.

**Abordagem A: Balança de Checkout (Ligada ao Caixa)**
*   **Como funciona:** O prato é colocado na balança ao lado do tablet/PC.
*   **Implementação:** Requer conexão Física (USB/Serial) ou Bluetooth.
*   **Viabilidade no Mobile:** Se usar tablet Android, é possível usar cabo OTG + Adaptador Serial, mas a biblioteca `react-native-serial` é complexa. Se a balança tiver **Bluetooth**, é viável e moderno.

**Abordagem B: Balança Etiquetadora (Arina/Toledo)**
*   **Como funciona:** O cliente pesa o prato em uma ilha separada. A balança imprime uma etiqueta com código de barras (iniciando com 2).
*   **Implementação:** O operador no caixa apenas usa a câmera do tablet ou um leitor USB básico para ler o código de barras.
*   **Viabilidade:** **Altíssima**. O código de barras já contém o preço ou o peso.
    *   Exemplo: `2AAAAAVVVVVVJ` (A=Item, V=Valor).
    *   O App Mobile precisa apenas de uma função no `NovoPedidoScreen` para "Ler Código de Barras". Nada de integração de hardware complexa.

**Recomendação:** Se o layout do restaurante permitir, adote a **Abordagem B (Etiquetas)** ou **Balanças com Bluetooth**. Evite cabos seriais ligados a tablets/celulares.

---

## 4. Detalhamento Técnico do Backend Sugerido

Para manter o "App Mobile leve" e usar o Supabase como "Hub Central", recomendamos a adoção de **Supabase Edge Functions** como primeira opção, evoluindo para um **Microsserviço Node.js** apenas se necessário.

### 4.1. Opção Recomendada: Supabase Edge Functions (Serverless)

Como você já utiliza o Supabase, esta é a opção natural. Edge Functions são códigos em TypeScript que rodam sob demanda nos servidores do Supabase (Deno), sem necessidade de contratar outro provedor de hospedagem.

#### Como funcionaria:

1.  **Delivery (iFood Webhook):**
    *   Você cadastra uma URL de Edge Function no painel do iFood (ex: `https://.../functions/v1/ifood-webhook`).
    *   Quando cai um pedido no iFood, eles chamam essa URL com o JSON do pedido.
    *   A Função recebe, trata os dados e insere na tabela `orders`.
    *   **Vantagem:** Custo quase zero, zero manutenção de servidor ligado 24/7.

2.  **Fiscal (Emissão de NFC-e):**
    *   O App Mobile chama `supabase.functions.invoke('emitir-nfce', { orderId: 123 })`.
    *   A Função valida o pedido (segurança: roda no backend, usuário não consegue fraudar facilmente).
    *   A Função chama a API Fiscal (Focus NFe, etc) e espera a resposta.
    *   A Função salva a URL da nota na tabela `orders` e retorna para o App.

3.  **Tarefas Agendadas (Cron):**
    *   O Supabase suporta `pg_cron` (agendamento no banco de dados) que pode chamar Edge Functions periodicamente para sincronizações que não suportem Webhook.

**Stack Sugerida:**
*   **Linguagem:** TypeScript (Deno).
*   **Hospedagem:** Próprio Supabase.
*   **Banco:** Já integrado.
*   **Segurança:** JWT do Supabase Auth já validado nativamente.

---

### 4.2. Opção Alternativa: Microsserviço Node.js (Container)

Caso você precise de processamento muito pesado, manter conexões TCP persistentes com equipamentos legados, ou bibliotecas que não funcionam no ambiente Deno/Edge.

#### Como funcionaria:
*   Um servidor pequeno (t2.micro na AWS, ou plano básico na Railway/DigitalOcean) rodando Node.js com Express ou NestJS.
*   Esse servidor fica ligado 24/7.
*   Ele conecta no banco do Supabase e "ouve" mudanças via Realtime para reagir (ex: quando um pedido muda para "Entregue", ele avisa o iFood).

**Quando escolhemos esta opção?**
*   Se o iFood Pollig for obrigatório e não puder usar Webhooks (raro hoje em dia).
*   Se precisar de processamento de imagem pesado no backend.
*   Se a equipe de desenvolvimento não se adaptar ao Deno/Edge Functions.

---

### 4.3. Comparativo e Decisão Final

| Recurso | Supabase Edge Functions (Recomendado) | Servidor Node.js Próprio |
| :--- | :--- | :--- |
| **Infraestrutura** | Zero config (já incluso no projeto) | Precisa configurar Linux/Docker |
| **Custo** | Paga por execução (milhões free no tier Pro) | Custo fixo mensal ($5 a $20/mês) |
| **Latência** | Baixíssima (roda na borda/CDN) | Depende da região do servidor |
| **Manutenção** | Código simples, deploy com `supabase cli` | Requer updates de OS, segurança, restart |
| **Webhooks** | Nativo | Precisa expor IP/Porta |

**Veredito:** Comece com **Supabase Edge Functions**.
É a extensão natural do seu projeto atual. É mais barato, escala infinitamente e mantém todo o código (front e back) no mesmo repositório e ecossistema. Use a Opção B (Node.js) apenas se encontrar uma barreira técnica intransponível nas Functions.

---

## 5. Roteiro de Implementação (Roadmap)

Para não travar a operação, sugerimos a seguinte ordem:

1.  **Fase 1: Preparação da Base (Mobile + DB)**
    *   Alterar `orders` e `products` para suportar novos campos.
    *   Criar UI de "Pedido Delivery" (campos de endereço).
2.  **Fase 2: Balança (Mais simples)**
    *   Implementar leitura de código de barras (camera) no `NovoPedidoScreen` (Abordagem B).
3.  **Fase 3: Delivery (Backend Serverless)**
    *   Criar Edge Function `webhook-delivery` para receber pedidos.
    *   Criar Edge Function `sync-status` para atualizar plataformas.
4.  **Fase 4: Fiscal (API + Edge Function)**
    *   Contratar API Fiscal.
    *   Criar Edge Function `emitir-nfce` para comunicar com a API.

## Conclusão
Mantenha o App Mobile focado na **Experiência do Usuário (Operador)** e na **Coleta de Dados**. Toda a lógica pesada de integração externa (iFood, SEFAZ) deve residir nas **Supabase Edge Functions**. Esta arquitetura garante um app rápido, seguro e fácil de manter.
