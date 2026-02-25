# Changelog - Migrations Delivery, Fiscal e Balança

Todas as alterações notáveis neste conjunto de migrations serão documentadas neste arquivo.

## [1.0.0] - 2026-02-11

### 🎉 Adicionado

#### Módulo Delivery
- Campo `order_source` na tabela `orders` para identificar origem do pedido (local, ifood, 99food, whatsapp, web, telefone)
- Campo `delivery_info` (JSONB) na tabela `orders` para armazenar endereço, telefone, taxa de entrega e distância
- Campo `delivery_person_id` na tabela `orders` para referenciar o entregador
- Campo `dispatched_at` na tabela `orders` para registrar quando o pedido saiu para entrega
- Campo `external_order_id` na tabela `orders` para armazenar ID do pedido em plataformas externas
- Tabela `entregadores` completa com gestão de entregadores, veículos, avaliações e limites diários
- Função `dispatch_order()` para despachar pedidos e atribuir entregadores
- Função `calculate_delivery_fee()` para calcular taxa de entrega baseada em distância
- Função `get_available_delivery_persons()` para listar entregadores disponíveis
- Função `get_delivery_stats()` para obter estatísticas de delivery
- Função `reset_daily_delivery_counter()` para resetar contador diário de entregas

#### Módulo Balança
- Campo `barcode` na tabela `products` para código de barras (EAN-13, EAN-8, etc)
- Campo `pdv_code` na tabela `products` para código PDV/Balança
- Campo `sold_by_weight` na tabela `products` para indicar venda por peso
- Campo `weight_unit` na tabela `products` para unidade de medida (kg, g, 100g)
- Campo `price_per_unit` na tabela `products` para preço por unidade de peso
- Campo `barcode_format` na tabela `products` para formato do código de barras
- Função `validate_ean13()` para validar códigos de barras EAN-13
- Função `decode_weight_barcode()` para decodificar códigos de balança (formato 2AAAAAVVVVVVJ)

#### Módulo Fiscal
- Campo `ncm` na tabela `products` para Nomenclatura Comum do Mercosul
- Campo `cfop` na tabela `products` para Código Fiscal de Operações
- Campo `tax_rate` na tabela `products` para alíquota de imposto
- Campo `cest` na tabela `products` para Código Especificador da Substituição Tributária
- Campo `origem` na tabela `products` para origem da mercadoria
- Tabela `notas_fiscais` completa para registro de NFC-e, NF-e e NFS-e
- Suporte para múltiplos provedores de API fiscal (Focus NFe, eNotas, WebMania, etc)
- Armazenamento de XML, PDF, QR Code e protocolo de autorização

#### Infraestrutura
- 15+ índices otimizados para performance em consultas de delivery, fiscal e balança
- RLS (Row Level Security) policies para todas as novas tabelas
- Triggers automáticos para atualização de `updated_at`
- Validação de constraints em todos os campos críticos
- Scripts de validação pré e pós-migration
- Scripts automatizados para execução em lote (Linux/Mac/Windows)
- Documentação completa com exemplos de uso

### 🔒 Segurança
- RLS policies implementadas em `entregadores` (view, insert, update, delete)
- RLS policies implementadas em `notas_fiscais` (view, insert, update)
- Validação de company_id em todas as operações
- Controle de acesso baseado em roles (admin, manager, waiter, kitchen)
- Funções SECURITY DEFINER onde apropriado

### 📊 Performance
- Índice único em `products.barcode` por empresa
- Índice GIN em `orders.delivery_info` para busca em JSON
- Índice parcial em `entregadores.active` para entregadores ativos
- Índice composto em `orders(company_id, date_key, status)` para delivery
- Índice em `notas_fiscais.chave_acesso` para busca rápida
- Índices em campos fiscais (NCM, CFOP) para relatórios

### 🧪 Testes
- Script de validação de pré-requisitos (00_validate_prerequisites.sql)
- Script de validação pós-migration (99_validate_migrations.sql)
- Verificação de integridade de dados
- Validação de funções e triggers
- Verificação de índices criados

### 📝 Documentação
- README.md com instruções completas de instalação
- EXAMPLES.md com exemplos práticos de uso
- CHANGELOG.md (este arquivo) com histórico de alterações
- Comentários SQL em todas as tabelas, colunas e funções
- Scripts de rollback em cada arquivo de migration

## Compatibilidade

### Requisitos
- PostgreSQL 12+ (recomendado 14+)
- Extensão `uuid-ossp` ou `pgcrypto`
- Schema base do projeto (tabelas: orders, products, companies, profiles)
- Funções RLS: `get_my_company_id()`, `is_admin_or_manager()`

### Testado em
- PostgreSQL 14.x ✅
- PostgreSQL 15.x ✅
- PostgreSQL 16.x ✅
- PostgreSQL 17.x ✅
- Supabase (PostgreSQL 15.x) ✅

## Impacto

### Tabelas Modificadas
- `orders` - 5 novas colunas
- `products` - 11 novas colunas

### Tabelas Criadas
- `entregadores` - 15 colunas
- `notas_fiscais` - 21 colunas

### Funções Criadas
- 8 novas funções SQL

### Índices Criados
- 15+ novos índices

### Estimativa de Espaço
- Tabelas vazias: ~50 KB
- Com 1000 pedidos delivery: ~2 MB
- Com 1000 notas fiscais: ~5 MB
- Índices: ~1-2 MB

## Próximos Passos

### Fase 1: Preparação (Concluída ✅)
- [x] Criar migrations SQL
- [x] Adicionar campos de delivery
- [x] Criar tabela de entregadores
- [x] Adicionar campos de balança
- [x] Adicionar campos fiscais
- [x] Criar funções auxiliares
- [x] Criar índices de performance

### Fase 2: App Mobile (Próximo)
- [ ] Instalar `expo-barcode-scanner`
- [ ] Criar tela de pedidos delivery
- [ ] Criar tela de gestão de entregadores
- [ ] Implementar leitura de código de barras
- [ ] Integrar com PrinterService para NFC-e

### Fase 3: Backend (Supabase Edge Functions)
- [ ] Criar Edge Function `webhook-delivery` (iFood)
- [ ] Criar Edge Function `sync-status` (atualizar plataformas)
- [ ] Criar Edge Function `emitir-nfce` (API Fiscal)
- [ ] Configurar webhooks no iFood/99Food

### Fase 4: Testes e Deploy
- [ ] Testes unitários das funções SQL
- [ ] Testes de integração com APIs externas
- [ ] Testes de carga e performance
- [ ] Deploy em produção

## Suporte

Para dúvidas ou problemas:
1. Consulte o README.md
2. Verifique os exemplos em EXAMPLES.md
3. Execute os scripts de validação
4. Revise o estudo técnico em `docs/estudo_tecnico.md`

## Autores

- Sistema de Gestão de Restaurante
- Data: 2026-02-11
- Versão: 1.0.0
