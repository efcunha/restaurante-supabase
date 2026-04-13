-- Tabela: products | Evento: RECADASTRO com categorias válidas
-- Data: 2026-04-13
-- Descrição: Deleta itens pesáveis com categorias inválidas e reinsere com categorias de sistema (comida/porcao/bebida)

DELETE FROM products
WHERE company_id = 'f85bfdc2-982a-4cf7-b176-bce68426f861'
  AND vendido_por_peso = true;

INSERT INTO products (id, company_id, name, category, unit, price, vendido_por_peso, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Bife acebolado', 'comida', 'kg', 55.00, true, 'Bife com cebola caramelizada', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Frango assado', 'comida', 'kg', 52.00, true, 'Frango desfiado assado', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Filé de frango à milanesa', 'comida', 'kg', 51.00, true, 'Filé de frango empanado e frito', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Frango grelhado', 'comida', 'kg', 50.00, true, 'Frango grelhado na chapa', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Bisteca suína', 'comida', 'kg', 48.00, true, 'Bisteca de carne suína', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Feijoada completa', 'comida', 'kg', 48.00, true, 'Feijoada com carne seca e costeleta', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Carne de panela', 'comida', 'kg', 46.00, true, 'Carne de panela macia', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Strogonoff de frango', 'comida', 'kg', 45.00, true, 'Strogonoff cremoso de frango', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Frango xadrez', 'comida', 'kg', 44.00, true, 'Frango xadrez com vegetais', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Lasanha', 'comida', 'kg', 43.00, true, 'Lasanha caseira à bolognesa', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Carne moída com chuchu', 'comida', 'kg', 42.00, true, 'Carne moída refogada com chuchu', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Arroz carreteiro', 'porcao', 'kg', 20.00, true, 'Arroz branco com linguiça', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Feijão carioca', 'porcao', 'kg', 22.00, true, 'Feijão carioca cozido', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Arroz branco/integral', 'porcao', 'kg', 18.00, true, 'Arroz branco ou integral', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Purê de batata', 'porcao', 'kg', 17.00, true, 'Purê caseiro de batata', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Macarrão alho e óleo', 'porcao', 'kg', 16.00, true, 'Macarrão com alho e óleo', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Espaguete', 'porcao', 'kg', 16.00, true, 'Espaguete ao molho ou alho/óleo', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Mandioca frita', 'porcao', 'kg', 16.00, true, 'Mandioca frita crocante', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Batata frita', 'porcao', 'kg', 15.00, true, 'Batata frita crocante', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Salada variada', 'porcao', 'kg', 15.00, true, 'Salada com alface, tomate, cebola', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Couve refogada', 'porcao', 'kg', 13.00, true, 'Couve refogada', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Alface', 'porcao', 'kg', 12.00, true, 'Alface fresca', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Abobrinha refogada', 'porcao', 'kg', 12.00, true, 'Abobrinha refogada', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Polenta frita', 'porcao', 'kg', 14.00, true, 'Polenta crocante frita', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Farofa', 'porcao', 'kg', 14.00, true, 'Farofa caseira', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Mix de folhas', 'porcao', 'kg', 14.00, true, 'Salada com mix de folhas verdes', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Torresmo', 'porcao', 'kg', 32.00, true, 'Torresmo crocante', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Beterraba', 'porcao', 'kg', 11.00, true, 'Beterraba cozida', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Tomate', 'porcao', 'kg', 10.00, true, 'Tomate fresco', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Cenoura ralada', 'porcao', 'kg', 9.00, true, 'Cenoura fresca ralada', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Tomate com cebola', 'porcao', 'kg', 9.00, true, 'Tomate fresco com cebola', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Repolho', 'porcao', 'kg', 8.00, true, 'Repolho fresco', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Pepino', 'porcao', 'kg', 8.00, true, 'Pepino fresco', NOW(), NOW()),
(gen_random_uuid(), 'f85bfdc2-982a-4cf7-b176-bce68426f861', 'Laranja', 'bebida', 'kg', 8.00, true, 'Laranja para suco', NOW(), NOW());
