# Roadmap de Implementação: Delivery, Fiscal e Balança

## Fase 1: Preparação da Base (Mobile + DB)
- [ ] Alterar tabela `orders` para suportar novos campos (delivery_info, order_source)
- [ ] Alterar tabela `products` para suportar códigos PDV/Balança
- [ ] Criar UI de "Pedido Delivery" no App Mobile (campos de endereço)

## Fase 2: Balança e Venda por Peso
- [ ] Implementar leitura de código de barras (câmera) no `NovoPedidoScreen`
- [ ] Implementar lógica de decomposição de código de barras (Preço/Peso) no `ProductService`

## Fase 3: Delivery (Backend Serverless)
- [ ] Configurar Supabase Edge Functions
- [ ] Criar Edge Function `webhook-delivery` para receber pedidos do iFood
- [ ] Criar Edge Function `sync-status` para atualizar status nas plataformas
- [ ] Criar tabela `entregadores` e fluxo de despacho no App

## Fase 4: Gestão Fiscal (API + Edge Function)
- [ ] Selecionar e Contratar API Fiscal (Focus NFe, eNotas, etc.)
- [ ] Criar Edge Function `emitir-nfce`
- [ ] Integrar retorno da API (URL do QRCode) com `PrinterService` no App

## Tarefas Concluídas (Análise)
- [x] Analisar estrutura do projeto e tecnologias utilizadas
- [x] Verificar existência de funcionalidades de Delivery
- [x] Verificar existência de funcionalidades Fiscais
- [x] Verificar existência de funcionalidades de Venda por Peso
- [x] Elaborar Documento de Estudo Técnico
- [x] Detalhar arquitetura de Backend
