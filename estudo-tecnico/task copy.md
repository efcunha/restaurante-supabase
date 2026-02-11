# 📋 Roadmap de Implementação: Delivery, Fiscal e Balança

Plano detalhado de implementação baseado no [Estudo Técnico](estudo_tecnico.md).

---

## 📊 Visão Geral

**Objetivo:** Implementar três módulos principais no sistema Restaurante Supabase:
1. 🚚 **Delivery** - Integração com iFood/99Food e gestão de entregas
2. 📄 **Gestão Fiscal** - Emissão de NFC-e/NF-e via API
3. ⚖️ **Venda por Peso** - Leitura de código de barras e balança

**Estimativa Total:** 14-20 dias úteis (3-4 semanas)

**Arquitetura:** Híbrida (Mobile + Supabase Edge Functions)

---

## 🎯 Fase 1: Preparação da Base (Mobile + DB)
**Duração:** 2-3 dias  
**Prioridade:** 🔴 Alta (Bloqueante para outras fases)

### 1.1 Database - Migrations SQL ✅
- [x] Executar migrations em ordem (ver `docs/migrations/`)
  - [x] `00_validate_prerequisites.sql` - Validar pré-requisitos
  - [x] `01_add_delivery_fields.sql` - Campos de delivery em orders
  - [x] `02_create_entregadores_table.sql` - Tabela de entregadores
  - [x] `03_add_barcode_fields.sql` - Campos de código de barras
  - [x] `04_add_fiscal_fields.sql` - Campos fiscais e tabela notas_fiscais
  - [x] `05_create_delivery_functions.sql` - Funções auxiliares
  - [x] `06_create_indexes.sql` - Índices de performance
  - [x] `99_validate_migrations.sql` - Validar tudo

**Comandos:**
```bash
cd docs/migrations
./run_all_migrations.sh "postgresql://..."
```

### 1.2 Mobile - Dependências
- [ ] Instalar `expo-barcode-scanner`
  ```bash
  cd restaurante-app
  npx expo install expo-barcode-scanner
  ```
- [ ] Atualizar `app.json` com permissões de câmera
- [ ] Testar scanner em dispositivo físico

### 1.3 Mobile - UI Base para Delivery
- [ ] Criar componente `DeliveryInfoForm.tsx`
  - [ ] Campos: endereço, bairro, complemento, telefone
  - [ ] Validação de campos obrigatórios
  - [ ] Cálculo automático de taxa de entrega
- [ ] Modificar `NovoPedidoScreen.tsx`
  - [ ] Adicionar toggle "Pedido Delivery"
  - [ ] Mostrar/ocultar formulário de delivery
  - [ ] Salvar `order_source` e `delivery_info`
- [ ] Criar tela `EntregadoresScreen.tsx`
  - [ ] Listar entregadores ativos
  - [ ] CRUD de entregadores (admin/manager)
  - [ ] Indicador de entregas do dia

### 1.4 Testes da Fase 1
- [ ] Criar pedido local (sem delivery) - deve funcionar normalmente
- [ ] Criar pedido delivery - deve salvar endereço e taxa
- [ ] Cadastrar entregador - deve aparecer na lista
- [ ] Validar RLS policies - usuários só veem dados da própria empresa

**Critério de Conclusão:** ✅ Migrations aplicadas, dependências instaladas, UI básica funcionando

---

## ⚖️ Fase 2: Balança e Venda por Peso
**Duração:** 2-3 dias  
**Prioridade:** 🟡 Média (Independente de Delivery e Fiscal)

### 2.1 Mobile - Leitura de Código de Barras
- [ ] Criar componente `BarcodeScannerModal.tsx`
  - [ ] Usar `expo-barcode-scanner`
  - [ ] Suportar formatos: EAN13, EAN8, CODE128
  - [ ] Feedback visual ao ler código
  - [ ] Botão para digitar código manualmente
- [ ] Integrar scanner no `NovoPedidoScreen.tsx`
  - [ ] Botão "Ler Código de Barras"
  - [ ] Buscar produto por código
  - [ ] Se não encontrar, permitir cadastro rápido

### 2.2 Services - Lógica de Balança
- [ ] Criar `BarcodeService.ts`
  - [ ] Função `validateEAN13(barcode: string): boolean`
  - [ ] Função `decodeWeightBarcode(barcode: string)`
    - [ ] Formato: `2AAAAAVVVVVVJ`
    - [ ] Extrair: código produto, valor/peso, dígito verificador
  - [ ] Função `calculatePriceByWeight(product, weight)`
- [ ] Atualizar `ProductService.ts`
  - [ ] Adicionar busca por código de barras
  - [ ] Suportar produtos vendidos por peso
  - [ ] Calcular preço baseado em peso

### 2.3 Mobile - Cadastro de Produtos
- [ ] Atualizar `CadastroProdutoScreen.tsx`
  - [ ] Campo "Código de Barras"
  - [ ] Campo "Código PDV"
  - [ ] Toggle "Vendido por Peso"
  - [ ] Campo "Preço por Kg" (se vendido por peso)
  - [ ] Campo "Unidade" (kg, g, 100g)

### 2.4 Testes da Fase 2
- [ ] Ler código de barras EAN-13 válido
- [ ] Ler código de balança (formato 2XXXXXX)
- [ ] Calcular preço por peso corretamente
- [ ] Adicionar produto por peso ao pedido
- [ ] Validar dígito verificador EAN-13

**Critério de Conclusão:** ✅ Scanner funcionando, produtos por peso calculados corretamente

---

## 🚚 Fase 3: Delivery (Backend Serverless)
**Duração:** 5-7 dias  
**Prioridade:** 🔴 Alta (Funcionalidade principal)

### 3.1 Supabase - Configuração Inicial
- [ ] Criar projeto de Edge Functions
  ```bash
  supabase functions new webhook-delivery
  supabase functions new sync-status
  ```
- [ ] Configurar variáveis de ambiente
  - [ ] `IFOOD_CLIENT_ID`
  - [ ] `IFOOD_CLIENT_SECRET`
  - [ ] `IFOOD_MERCHANT_ID`
- [ ] Configurar CORS para Edge Functions

### 3.2 Edge Function - webhook-delivery
- [ ] Criar `supabase/functions/webhook-delivery/index.ts`
  - [ ] Validar webhook do iFood (assinatura)
  - [ ] Parsear JSON do pedido iFood
  - [ ] Mapear campos iFood → orders
    - [ ] `order_source = 'ifood'`
    - [ ] `external_order_id = iFood order ID`
    - [ ] `delivery_info = { address, phone, ... }`
  - [ ] Inserir pedido no Supabase
  - [ ] Retornar confirmação para iFood
- [ ] Tratar erros e retry
- [ ] Adicionar logs detalhados

### 3.3 Edge Function - sync-status
- [ ] Criar `supabase/functions/sync-status/index.ts`
  - [ ] Receber mudança de status do pedido
  - [ ] Atualizar status no iFood via API
  - [ ] Mapear status:
    - [ ] `preparing` → "confirmed"
    - [ ] `ready` → "ready_to_pickup"
    - [ ] `dispatched` → "dispatched"
    - [ ] `delivered` → "concluded"
  - [ ] Tratar erros de API
- [ ] Criar trigger no Supabase
  ```sql
  CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_status_change();
  ```

### 3.4 Mobile - Gestão de Entregas
- [ ] Criar tela `DeliveryManagementScreen.tsx`
  - [ ] Listar pedidos delivery pendentes
  - [ ] Filtros: status, origem (iFood, 99Food, local)
  - [ ] Card com: endereço, telefone, valor, tempo
- [ ] Criar modal `DispatchOrderModal.tsx`
  - [ ] Selecionar entregador disponível
  - [ ] Mostrar entregas atuais do entregador
  - [ ] Confirmar despacho
  - [ ] Chamar função `dispatch_order()`
- [ ] Atualizar `OrderService.ts`
  - [ ] Função `dispatchOrder(orderId, deliveryPersonId)`
  - [ ] Atualizar `dispatched_at` e `delivery_person_id`
  - [ ] Incrementar contador do entregador

### 3.5 Integração iFood
- [ ] Cadastrar webhook no painel iFood
  - [ ] URL: `https://[project].supabase.co/functions/v1/webhook-delivery`
  - [ ] Eventos: `order.placed`, `order.confirmed`
- [ ] Testar recebimento de pedidos
- [ ] Configurar autenticação OAuth2 iFood
- [ ] Implementar refresh token automático

### 3.6 Testes da Fase 3
- [ ] Simular webhook iFood (Postman/curl)
- [ ] Pedido iFood aparece no app mobile
- [ ] Despachar pedido com entregador
- [ ] Status atualiza no iFood
- [ ] Testar erro de API (retry)
- [ ] Validar logs de Edge Functions

**Critério de Conclusão:** ✅ Pedidos iFood chegam automaticamente, status sincroniza, entregadores funcionando

---

## 📄 Fase 4: Gestão Fiscal (API + Edge Function)
**Duração:** 5-7 dias  
**Prioridade:** 🟡 Média (Pode ser implementado em paralelo com Fase 3)

### 4.1 Seleção e Contratação de API Fiscal
- [ ] Pesquisar e comparar APIs:
  - [ ] Focus NFe (https://focusnfe.com.br)
  - [ ] eNotas (https://enotas.com.br)
  - [ ] WebMania (https://webmaniabr.com)
- [ ] Contratar plano (recomendado: Focus NFe)
- [ ] Obter credenciais de API
- [ ] Testar API em ambiente sandbox

### 4.2 Database - Configuração Fiscal
- [ ] Criar tabela `fiscal_config`
  ```sql
  CREATE TABLE fiscal_config (
    company_id UUID PRIMARY KEY REFERENCES companies(id),
    api_provider TEXT NOT NULL,
    api_token TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    inscricao_estadual TEXT,
    regime_tributario TEXT,
    ambiente TEXT DEFAULT 'homologacao',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Criar tela de configuração fiscal no app (admin only)

### 4.3 Edge Function - emitir-nfce
- [ ] Criar `supabase/functions/emitir-nfce/index.ts`
  - [ ] Validar permissões (admin/manager)
  - [ ] Buscar dados do pedido
  - [ ] Buscar configuração fiscal da empresa
  - [ ] Montar payload para API fiscal
    - [ ] Dados do emitente (empresa)
    - [ ] Dados do destinatário (cliente)
    - [ ] Itens do pedido (produtos)
    - [ ] Totais e impostos
  - [ ] Chamar API fiscal (Focus NFe)
  - [ ] Processar resposta
    - [ ] Sucesso: salvar chave de acesso, PDF, QR Code
    - [ ] Erro: retornar mensagem de erro
  - [ ] Inserir registro em `notas_fiscais`
  - [ ] Retornar resultado para o app

### 4.4 Mobile - Emissão de Nota
- [ ] Atualizar `PagamentoScreen.tsx`
  - [ ] Adicionar campo "CPF/CNPJ na Nota?" (opcional)
  - [ ] Botão "Emitir NFC-e"
  - [ ] Mostrar loading durante emissão
  - [ ] Exibir resultado (sucesso/erro)
- [ ] Criar modal `NotaFiscalModal.tsx`
  - [ ] Mostrar dados da nota emitida
  - [ ] QR Code para consulta
  - [ ] Botão "Imprimir"
  - [ ] Botão "Enviar por Email/WhatsApp"
- [ ] Integrar com `PrinterService.ts`
  - [ ] Adicionar função `printNFCe(notaData)`
  - [ ] Imprimir QR Code no rodapé do cupom
  - [ ] Imprimir chave de acesso

### 4.5 Mobile - Cadastro Fiscal de Produtos
- [ ] Atualizar `CadastroProdutoScreen.tsx`
  - [ ] Campo "NCM" (8 dígitos)
  - [ ] Campo "CFOP" (4 dígitos)
  - [ ] Campo "Alíquota (%)"
  - [ ] Campo "CEST" (opcional)
  - [ ] Campo "Origem" (0-8)
  - [ ] Validação de campos fiscais

### 4.6 Mobile - Consulta de Notas
- [ ] Criar tela `NotasFiscaisScreen.tsx`
  - [ ] Listar notas emitidas
  - [ ] Filtros: data, status, cliente
  - [ ] Detalhes da nota ao clicar
  - [ ] Opções: reimprimir, cancelar, enviar
- [ ] Implementar cancelamento de nota
  - [ ] Chamar API fiscal para cancelar
  - [ ] Atualizar status no banco
  - [ ] Registrar motivo do cancelamento

### 4.7 Testes da Fase 4
- [ ] Emitir NFC-e em ambiente de homologação
- [ ] Validar XML gerado
- [ ] Imprimir cupom com QR Code
- [ ] Consultar nota no site da SEFAZ
- [ ] Testar cancelamento de nota
- [ ] Validar cálculo de impostos
- [ ] Testar com CPF/CNPJ do cliente

**Critério de Conclusão:** ✅ NFC-e emitida com sucesso, QR Code impresso, consulta funcionando

---

## 🔄 Tarefas Transversais (Durante Todas as Fases)

### Documentação
- [ ] Atualizar README.md do projeto
- [ ] Documentar Edge Functions criadas
- [ ] Criar guia de configuração para novos ambientes
- [ ] Documentar fluxos de integração (diagramas)

### Testes
- [ ] Testes unitários dos services
- [ ] Testes de integração das Edge Functions
- [ ] Testes E2E dos fluxos principais
- [ ] Testes de carga (simular múltiplos pedidos)

### Segurança
- [ ] Revisar RLS policies
- [ ] Validar autenticação nas Edge Functions
- [ ] Criptografar credenciais sensíveis
- [ ] Implementar rate limiting

### Monitoramento
- [ ] Configurar logs estruturados
- [ ] Adicionar métricas (Sentry/Analytics)
- [ ] Criar dashboard de monitoramento
- [ ] Configurar alertas de erro

---

## 📈 Métricas de Sucesso

### Delivery
- ✅ Pedidos iFood chegam em < 30 segundos
- ✅ Taxa de erro de sincronização < 1%
- ✅ 100% dos pedidos rastreáveis

### Balança
- ✅ Leitura de código em < 2 segundos
- ✅ 0% de erro de cálculo de peso
- ✅ Suporte a 100% dos formatos de código

### Fiscal
- ✅ Emissão de NFC-e em < 5 segundos
- ✅ Taxa de autorização > 99%
- ✅ 0% de notas rejeitadas por erro de dados

---

## 🚀 Próximos Passos Imediatos

1. **Revisar e aprovar este roadmap** ✅
2. **Executar migrations SQL** (Fase 1.1)
3. **Instalar expo-barcode-scanner** (Fase 1.2)
4. **Criar branch de desenvolvimento**
   ```bash
   git checkout -b feature/delivery-fiscal-balanca
   ```
5. **Iniciar Fase 1** 🚀

---

## 📞 Suporte e Recursos

- **Estudo Técnico:** [estudo_tecnico.md](estudo_tecnico.md)
- **Migrations SQL:** [migrations/](migrations/)
- **Backup Database:** [../database-backup/](../database-backup/)
- **Documentação Supabase:** https://supabase.com/docs
- **API Focus NFe:** https://focusnfe.com.br/doc/
- **API iFood:** https://developer.ifood.com.br/

---

**Última atualização:** 2026-02-11  
**Versão:** 2.0.0  
**Status:** 📋 Planejamento Completo
