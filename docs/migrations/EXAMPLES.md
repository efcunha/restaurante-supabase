# Exemplos de Uso - Novas Funcionalidades

Este documento contém exemplos práticos de como usar as novas funcionalidades implementadas pelas migrations.

## 📦 Delivery

### Criar um pedido delivery
```sql
INSERT INTO orders (
  company_id,
  comanda_number,
  order_source,
  delivery_info,
  status,
  items,
  total_amount,
  created_by,
  date_key
) VALUES (
  'uuid-da-empresa',
  101,
  'ifood',
  '{
    "address": "Rua das Flores, 123",
    "neighborhood": "Centro",
    "complement": "Apto 45",
    "phone": "(11) 98765-4321",
    "delivery_fee": 8.50,
    "distance_km": 3.2
  }'::jsonb,
  'pending',
  '[{"name": "Pizza Margherita", "quantity": 1, "price": 45.00}]'::jsonb,
  53.50,
  'uuid-do-usuario',
  CURRENT_DATE
);
```

### Buscar entregadores disponíveis
```sql
SELECT * FROM get_available_delivery_persons('uuid-da-empresa');
```

### Despachar um pedido
```sql
SELECT dispatch_order(
  'uuid-do-pedido',
  'uuid-do-entregador',
  'uuid-do-usuario-que-despachou'
);
```

### Calcular taxa de entrega
```sql
SELECT calculate_delivery_fee(3.5, 'uuid-da-empresa') as taxa;
-- Retorna: 12.00 (exemplo)
```

### Buscar pedidos delivery do dia
```sql
SELECT 
  id,
  comanda_number,
  order_source,
  delivery_info->>'address' as endereco,
  delivery_info->>'phone' as telefone,
  status,
  total_amount,
  dispatched_at
FROM orders
WHERE 
  company_id = 'uuid-da-empresa'
  AND date_key = CURRENT_DATE
  AND order_source != 'local'
ORDER BY created_at DESC;
```

### Estatísticas de delivery
```sql
SELECT get_delivery_stats(
  'uuid-da-empresa',
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE
);
```

## 🏷️ Balança e Código de Barras

### Cadastrar produto com código de barras
```sql
UPDATE products
SET 
  barcode = '7891234567890',
  pdv_code = 'PDV001',
  sold_by_weight = true,
  weight_unit = 'kg',
  price_per_unit = 45.90,
  barcode_format = 'EAN13'
WHERE id = 'uuid-do-produto';
```

### Validar código de barras EAN-13
```sql
SELECT validate_ean13('7891234567890');
-- Retorna: true ou false
```

### Decodificar código de balança
```sql
SELECT * FROM decode_weight_barcode('2001230045006');
-- Retorna:
-- product_code: 00123
-- value_or_weight: 450.06
-- is_price: true
-- check_digit: 6
```

### Buscar produto por código de barras
```sql
SELECT 
  id,
  name,
  barcode,
  sold_by_weight,
  price_per_unit,
  weight_unit
FROM products
WHERE 
  company_id = 'uuid-da-empresa'
  AND barcode = '7891234567890';
```

### Listar produtos vendidos por peso
```sql
SELECT 
  name,
  barcode,
  price_per_unit,
  weight_unit
FROM products
WHERE 
  company_id = 'uuid-da-empresa'
  AND sold_by_weight = true
  AND active = true
ORDER BY name;
```

## 📄 Gestão Fiscal

### Cadastrar informações fiscais do produto
```sql
UPDATE products
SET 
  ncm = '21069090',
  cfop = '5102',
  tax_rate = 18.00,
  cest = '1700100',
  origem = 0
WHERE id = 'uuid-do-produto';
```

### Registrar emissão de NFC-e
```sql
INSERT INTO notas_fiscais (
  company_id,
  order_id,
  numero_nota,
  serie,
  tipo,
  status,
  valor_total,
  valor_produtos,
  valor_impostos,
  cpf_cnpj_cliente,
  nome_cliente,
  api_provider,
  data_emissao
) VALUES (
  'uuid-da-empresa',
  'uuid-do-pedido',
  '000123',
  '1',
  'nfce',
  'processando',
  53.50,
  50.00,
  3.50,
  '12345678900',
  'João Silva',
  'focus_nfe',
  NOW()
);
```

### Atualizar nota fiscal após autorização
```sql
UPDATE notas_fiscais
SET 
  status = 'autorizada',
  chave_acesso = '35240112345678901234550010001230001234567890',
  protocolo_autorizacao = '135240000123456',
  pdf_url = 'https://api.focusnfe.com.br/nfce/123.pdf',
  qrcode_url = 'https://api.focusnfe.com.br/nfce/123/qrcode',
  data_autorizacao = NOW(),
  api_response = '{
    "status": "autorizado",
    "mensagem": "Nota autorizada com sucesso"
  }'::jsonb
WHERE id = 'uuid-da-nota';
```

### Buscar notas fiscais do dia
```sql
SELECT 
  numero_nota,
  serie,
  tipo,
  status,
  valor_total,
  nome_cliente,
  data_emissao,
  chave_acesso
FROM notas_fiscais
WHERE 
  company_id = 'uuid-da-empresa'
  AND DATE(data_emissao) = CURRENT_DATE
ORDER BY data_emissao DESC;
```

### Buscar notas por CPF/CNPJ
```sql
SELECT 
  numero_nota,
  tipo,
  valor_total,
  data_emissao,
  status
FROM notas_fiscais
WHERE 
  company_id = 'uuid-da-empresa'
  AND cpf_cnpj_cliente = '12345678900'
ORDER BY data_emissao DESC;
```

## 👤 Gestão de Entregadores

### Cadastrar novo entregador
```sql
INSERT INTO entregadores (
  company_id,
  name,
  phone,
  cpf,
  vehicle_type,
  vehicle_plate,
  max_deliveries_per_day
) VALUES (
  'uuid-da-empresa',
  'Carlos Motoboy',
  '(11) 98765-4321',
  '12345678900',
  'moto',
  'ABC-1234',
  30
);
```

### Atualizar avaliação do entregador
```sql
UPDATE entregadores
SET 
  rating = 4.8,
  updated_at = NOW()
WHERE id = 'uuid-do-entregador';
```

### Listar entregadores ativos
```sql
SELECT 
  name,
  phone,
  vehicle_type,
  current_deliveries_today,
  max_deliveries_per_day,
  rating,
  total_deliveries
FROM entregadores
WHERE 
  company_id = 'uuid-da-empresa'
  AND active = true
ORDER BY rating DESC;
```

### Resetar contador diário (executar à meia-noite via cron)
```sql
SELECT reset_daily_delivery_counter();
```

## 📊 Relatórios e Consultas

### Pedidos delivery por origem
```sql
SELECT 
  order_source,
  COUNT(*) as total_pedidos,
  SUM(total_amount) as faturamento,
  AVG(total_amount) as ticket_medio
FROM orders
WHERE 
  company_id = 'uuid-da-empresa'
  AND date_key >= CURRENT_DATE - INTERVAL '30 days'
  AND order_source != 'local'
GROUP BY order_source
ORDER BY faturamento DESC;
```

### Performance dos entregadores
```sql
SELECT 
  e.name,
  e.total_deliveries,
  e.rating,
  COUNT(o.id) as entregas_hoje,
  AVG(EXTRACT(EPOCH FROM (o.dispatched_at - o.created_at)) / 60) as tempo_medio_minutos
FROM entregadores e
LEFT JOIN orders o ON o.delivery_person_id = e.id 
  AND o.date_key = CURRENT_DATE
WHERE e.company_id = 'uuid-da-empresa'
GROUP BY e.id, e.name, e.total_deliveries, e.rating
ORDER BY e.rating DESC;
```

### Produtos mais vendidos por peso
```sql
SELECT 
  p.name,
  p.price_per_unit,
  COUNT(o.id) as total_vendas,
  SUM((o.items->0->>'quantity')::numeric) as kg_vendidos
FROM products p
JOIN orders o ON o.items @> jsonb_build_array(jsonb_build_object('productId', p.id))
WHERE 
  p.company_id = 'uuid-da-empresa'
  AND p.sold_by_weight = true
  AND o.date_key >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name, p.price_per_unit
ORDER BY total_vendas DESC
LIMIT 10;
```

### Notas fiscais emitidas no mês
```sql
SELECT 
  DATE(data_emissao) as data,
  COUNT(*) as total_notas,
  SUM(valor_total) as valor_total,
  COUNT(*) FILTER (WHERE status = 'autorizada') as autorizadas,
  COUNT(*) FILTER (WHERE status = 'rejeitada') as rejeitadas
FROM notas_fiscais
WHERE 
  company_id = 'uuid-da-empresa'
  AND data_emissao >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE(data_emissao)
ORDER BY data DESC;
```

## 🔧 Manutenção

### Verificar integridade dos dados
```sql
-- Pedidos delivery sem informações de entrega
SELECT id, comanda_number, order_source
FROM orders
WHERE order_source != 'local' 
  AND delivery_info = '{}'::jsonb;

-- Produtos com código de barras duplicado
SELECT barcode, COUNT(*) as duplicatas
FROM products
WHERE barcode IS NOT NULL
GROUP BY barcode
HAVING COUNT(*) > 1;

-- Entregadores com entregas acima do limite
SELECT name, current_deliveries_today, max_deliveries_per_day
FROM entregadores
WHERE current_deliveries_today > max_deliveries_per_day;
```

### Limpar dados antigos
```sql
-- Arquivar notas fiscais antigas (mais de 5 anos)
-- CUIDADO: Verifique legislação antes de deletar notas fiscais!
UPDATE notas_fiscais
SET api_response = NULL, xml_nota = NULL
WHERE data_emissao < CURRENT_DATE - INTERVAL '5 years';
```
