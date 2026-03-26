-- Migration: Seed ingredients for Caldos and Comidas products
-- Date: 2026-03-26
-- Purpose: Populate the ingredients[] column for existing caldo and comida products
--          as requested by the restaurant operator. The ingredients are stored as a
--          text[] array and will be displayed in the Novo Pedido screen and admin panel.

-- =====================================================================
-- CALDOS
-- =====================================================================

UPDATE public.products
SET ingredients = ARRAY[
  'Fava', 'Charque', 'Mocoto', 'Bacon', 'Dobradinha', 'Calabresa', 'Carne'
]
WHERE category = 'caldo'
  AND name ILIKE '%fava%';

UPDATE public.products
SET ingredients = ARRAY[
  'File de Camarão', 'File de Peixe', 'Macaxeira', 'Leite de Coco'
]
WHERE category = 'caldo'
  AND name ILIKE '%camarão%';

UPDATE public.products
SET ingredients = ARRAY[
  'Creme de Macaxeira', 'Charque', 'Bacon', 'Calabresa', 'Carne'
]
WHERE category = 'caldo'
  AND name ILIKE '%macaxeira%';

UPDATE public.products
SET ingredients = ARRAY[
  'Creme de Milho Verde', 'Costela Bovina Desfiada'
]
WHERE category = 'caldo'
  AND name ILIKE '%kenga%';

-- =====================================================================
-- COMIDAS
-- =====================================================================

UPDATE public.products
SET ingredients = ARRAY[
  'Arroz Arboreo', 'File de Camarão', 'Leite de Coco', 'Mussarela', 'Batata Palha'
]
WHERE category = 'comida'
  AND name ILIKE '%risoto%camarão%';

UPDATE public.products
SET ingredients = ARRAY[
  'Arroz Arboreo', 'Charque', 'Queijo Coalho', 'Nata', 'Mussarela', 'Batata Palha'
]
WHERE category = 'comida'
  AND name ILIKE '%risoto%charque%';

UPDATE public.products
SET ingredients = ARRAY[
  'Arroz Arboreo', 'Frango', 'Mussarela', 'Requeijão', 'Batata Palha'
]
WHERE category = 'comida'
  AND name ILIKE '%risoto%frango%';

UPDATE public.products
SET ingredients = ARRAY[
  'Arroz Arboreo', 'Parmessão', 'Queijo Coalho', 'Mussarela', 'Requeijão', 'Batata Palha'
]
WHERE category = 'comida'
  AND name ILIKE '%risoto%queijo%';
