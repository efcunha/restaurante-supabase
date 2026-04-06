# 04 - Dados, migracoes e RLS

## 1. Objetivo de dados

Preparar o modelo para suportar venda por peso com rastreabilidade por item e configuracao por empresa.

## 2. Entidades envolvidas

### 2.1 products

Campos planejados:

- vendido_por_peso: boolean (default false)
- preco_por_kg: numeric(10,2)

Impacto:

- Habilita classificacao de catalogo por unidade de venda.

### 2.2 order_items

Campo planejado:

- peso_kg: numeric(8,3)

Impacto:

- Preserva origem do valor por peso no item vendido.

### 2.3 balanca_config

Tabela planejada por company_id:

- bridge_url
- api_key (armazenamento seguro)
- protocolo
- ativo
- created_at / updated_at

## 3. Regras multi-tenant

- Todas as leituras e escritas devem respeitar company_id.
- RLS deve limitar acesso de configuracao de balanca ao proprio tenant.
- Chave unica por empresa para evitar configuracoes duplicadas ativas.

## 4. Politicas RLS

Diretriz:

- Policy baseada em profiles.company_id = auth.uid() com join seguro.
- Nao abrir acesso global para tabela de configuracao.

## 5. Indices recomendados

- products(company_id, vendido_por_peso) com filtro vendido_por_peso=true.
- balanca_config(company_id) unico.

## 6. Compatibilidade retroativa

- Novas colunas com IF NOT EXISTS.
- Defaults seguros para nao quebrar fluxo atual.
- Preenchimento gradual de dados sem bloquear operacao legada.

## 7. Ordem de aplicacao futura (quando iniciar implementacao)

1. Migracao de catalogo (products).
2. Migracao de itens de pedido (order_items).
3. Migracao de configuracao de balanca (balanca_config + RLS).
4. Validacao de schema remoto e policies.

## 8. Riscos de dados

- Dados incompletos de preco_por_kg em produtos marcados como pesaveis.
- Inconsistencia entre peso_kg e valor_total em item manual.
- Configuracao de bridge desatualizada por empresa.

Mitigacoes:

- Validacao de integridade no service de pedido.
- Alertas para produto pesavel sem preco_por_kg.
- Auditoria de atualizacao de balanca_config.
