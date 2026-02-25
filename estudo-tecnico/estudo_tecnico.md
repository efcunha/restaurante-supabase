# Estudo Técnico: Implementação de Delivery, Gestão Fiscal e Venda por Peso

## 1. Introdução e Contexto
O objetivo deste estudo é analisar a viabilidade e definir a melhor abordagem técnica para incorporar três grandes módulos ao sistema "Restaurante Supabase": **Delivery**, **Gestão Fiscal** e **Venda por Peso**.
Atualmente, o projeto consiste em um aplicativo móvel (React Native/Expo) integrado ao Supabase. Existe uma preocupação válida sobre a sobrecarga do aplicativo móvel ("App muito pesado") e a complexidade de manter integrações de terceiros diretamente no cliente (celular do usuário).

**Conclusão Inicial:** A intuição de não implementar tudo no Mobile está correta. Funcionalidades como integração com iFood e Emissão Fiscal dependem de comunicação estável, chaves de API secretas e webhooks que não devem rodar em um dispositivo móvel instável.
Recomenda-se uma arquitetura **Híbrida**, onde o App Mobile serve como "Controle", mas o processamento pesado fica no **Backend**.

---

## 2. Análise do Projeto Atual

### 2.1 Tecnologias Identificadas
- **Frontend/Mobile:** React Native com Expo (SDK 54.0.31), TypeScript.
- **Backend/Database:** Supabase (PostgreSQL, Auth, Realtime).
- **Segurança:** Row Level Security (RLS) já implementado com políticas baseadas em `company_id` e roles.
- **Serviços Principais:** 
  - `OrderService.ts`: Gerencia regras de negócio de pedidos.
  - `PagamentosService.ts`: Registra pagamentos e atualiza comandas.
  - `PrinterService.ts`: Já existe suporte a impressoras térmicas (importante para Delivery e Fiscal).
- **Infraestrutura:** Sistema já preparado para escala com particionamento mensal de tabelas.

### 2.2 O que já existe (e pode ser aproveitado)
- **Estrutura de Pedidos (`OrderService`):** O sistema já possui um fluxo de status (`pending`, `preparing`, `ready`, `delivered`, `cancelled`). O status `delivered` pode ser reutilizado para delivery, ou podemos adicionar `dispatched` para diferenciar "pronto para retirada" de "saiu para entrega".
- **Impressão (`PrinterService`):** A lógica de comunicação com impressoras já existe, facilitando a impressão de vias de entrega e DANFE (NFC-e).
- **Cadastro de Produtos:** Já suporta categorias, preços (incluindo JSONB para múltiplos preços), ingredientes e subcategorias. Precisará de campos extras para integração com iFood e Balança.
- **Segurança RLS:** Políticas de segurança já implementadas garantem isolamento por empresa e controle de acesso por roles.

### 2.3 O que falta (Lacunas)
- **Delivery:** 
  - Campos ausentes na tabela `orders`: `order_source` (TEXT), `delivery_info` (JSONB com endereço, telefone, taxa)
  - Tabela `entregadores` não existe
  - Biblioteca de leitura de código de barras não instalada (necessário `expo-barcode-scanner` ou similar)
- **Fiscal:** 
  - `PagamentosService` apenas registra valores. Não há lógica de tributação (NCM, CFOP, Alíquotas) nem comunicação com SEFAZ.
  - Campos fiscais ausentes na tabela `products`: `ncm`, `cfop`, `tax_rate`
- **Balança:** 
  - Campos ausentes na tabela `products`: `barcode` (TEXT), `pdv_code` (TEXT), `sold_by_weight` (BOOLEAN)
  - Não há lógica de decomposição de código de barras (formato EAN-13 para peso/preço)

---

## 3. Abordagem Recomendada por Módulo

### Módulo 1: Vendas com Delivery (Pontos 1 a 9)

**Desafio:** O iFood e outros apps funcionam via "Polling" (consultar pedidos a cada 30s) ou "Webhooks" (o iFood avisa quando tem pedido). Manter o App Mobile "ouvindo" o iFood é inviável (bateria, app em segundo plano morre).

**Solução Arquitetural:**
Criar um **Integrador Backend** (ver seção 4).

1.  **Vendas do tipo "Delivery" & Integração (iFood/99):**
    *   O Backend consulta ou recebe do iFood. Ao identificar um pedido, insere no Supabase.
    *   O App Mobile, que já usa Supabase Realtime, receberá o pedido automaticamente na tela de "Novos Pedidos" ou uma nova aba "Delivery".
    *   *Ajuste no Projeto:* 
        ```sql
        ALTER TABLE orders ADD COLUMN order_source TEXT CHECK (order_source IN ('local', 'ifood', '99food', 'whatsapp', 'web'));
        ALTER TABLE orders ADD COLUMN delivery_info JSONB DEFAULT '{}'::jsonb;
        -- delivery_info structure: {"address": "...", "phone": "...", "delivery_fee": 5.00, "distance_km": 2.5}
        ```

2.  **Cardápio Digital:**
    *   Não faça isso dentro do App Mobile de gestão. Crie uma **Web Page** simples (Next.js ou React) que lê do mesmo Supabase. Cliente acessa pelo navegador, faz o pedido, e cai direto no Supabase.

3.  **Fluxo de Status e Entregador:**
    *   *Ajuste no Projeto:* Criar tabela `entregadores`:
        ```sql
        CREATE TABLE entregadores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT,
          vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'carro', 'bicicleta')),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE orders ADD COLUMN delivery_person_id UUID REFERENCES entregadores(id);
        ALTER TABLE orders ADD COLUMN dispatched_at TIMESTAMPTZ;
        ```
    *   No App Mobile, ao finalizar um pedido Delivery, o operador seleciona o entregador.
    *   O Backend atualiza o status no iFood automaticamente (via Trigger do Supabase ou Edge Function).

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
    *   *Ajuste no Projeto:*
        ```sql
        ALTER TABLE products ADD COLUMN barcode TEXT;
        ALTER TABLE products ADD COLUMN pdv_code TEXT;
        ALTER TABLE products ADD COLUMN sold_by_weight BOOLEAN DEFAULT false;
        CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
        ```
    *   *Dependência:* Instalar `expo-barcode-scanner`:
        ```bash
        npx expo install expo-barcode-scanner
        ```

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

1.  **Fase 1: Preparação da Base (Mobile + DB)** - 2-3 dias
    *   Executar migrations SQL para adicionar campos em `orders` e `products`
    *   Criar tabela `entregadores`
    *   Instalar `expo-barcode-scanner`
    *   Criar UI de "Pedido Delivery" (campos de endereço no `NovoPedidoScreen`)
    
2.  **Fase 2: Balança (Mais simples)** - 2-3 dias
    *   Implementar leitura de código de barras (câmera) no `NovoPedidoScreen`
    *   Criar função de decomposição de código EAN-13 no `ProductService`
    *   Adicionar lógica de cálculo por peso
    
3.  **Fase 3: Delivery (Backend Serverless)** - 5-7 dias
    *   Configurar Supabase Edge Functions (ambiente de desenvolvimento)
    *   Criar Edge Function `webhook-delivery` para receber pedidos do iFood
    *   Criar Edge Function `sync-status` para atualizar status nas plataformas
    *   Implementar tela de gestão de entregadores no App
    *   Adicionar fluxo de despacho de pedidos
    
4.  **Fase 4: Fiscal (API + Edge Function)** - 5-7 dias
    *   Selecionar e contratar API Fiscal (Focus NFe, eNotas, etc.)
    *   Criar Edge Function `emitir-nfce`
    *   Integrar retorno da API (URL do QRCode) com `PrinterService`
    *   Adicionar campos fiscais no cadastro de produtos
    *   Implementar tela de configuração fiscal

## 6. Conclusão e Validação Técnica

### Validação do Projeto Atual
O projeto está bem estruturado com:
- ✅ Arquitetura sólida (React Native + Supabase)
- ✅ Segurança implementada (RLS policies)
- ✅ Preparado para escala (particionamento de tabelas)
- ✅ Serviços principais bem organizados
- ✅ Suporte a impressão já existente

### Recomendações Finais
Mantenha o App Mobile focado na **Experiência do Usuário (Operador)** e na **Coleta de Dados**. Toda a lógica pesada de integração externa (iFood, SEFAZ) deve residir nas **Supabase Edge Functions**. Esta arquitetura garante um app rápido, seguro e fácil de manter.

### Estimativa Total de Implementação
- **Fase 1 (Base):** 2-3 dias
- **Fase 2 (Balança):** 2-3 dias  
- **Fase 3 (Delivery):** 5-7 dias
- **Fase 4 (Fiscal):** 5-7 dias
- **Total:** 14-20 dias úteis (3-4 semanas)

### Próximos Passos Imediatos
1. Revisar e aprovar as migrations SQL propostas
2. Criar ambiente de testes no Supabase
3. Instalar dependências necessárias (`expo-barcode-scanner`)
4. Iniciar Fase 1 (Preparação da Base)
