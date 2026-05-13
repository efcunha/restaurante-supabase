BEGIN;

-- Bootstrap inicial do tenant alvo.
-- A lista em companies.settings.bebidasSubcategories e os produtos abaixo
-- servem para seed/migração de dados, não como fallback de runtime.

UPDATE public.companies
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'bebidasSubcategories',
  jsonb_build_array(
    'Bebidas Não Alcoólicas',
    'Drinks',
    'Doses',
    'Whiskies'
  )
)
WHERE id = 'f85bfdc2-982a-4cf7-b176-bce68426f861';

WITH bebida_items(name, description, price, subcategory) AS (
  VALUES
    ('Refrigerante (lata)', NULL::text, 8::numeric, 'Bebidas Não Alcoólicas'),
    ('Água Tônica (lata)', NULL::text, 8::numeric, 'Bebidas Não Alcoólicas'),
    ('H2OH! (garrafa)', NULL::text, 9::numeric, 'Bebidas Não Alcoólicas'),
    ('Redbull (lata)', NULL::text, 16::numeric, 'Bebidas Não Alcoólicas'),
    ('Suco (copo)', NULL::text, 8::numeric, 'Bebidas Não Alcoólicas'),
    ('Suco uva integral (garrafa)', NULL::text, 16::numeric, 'Bebidas Não Alcoólicas'),
    ('Água mineral (garrafa)', NULL::text, 7::numeric, 'Bebidas Não Alcoólicas'),
    ('Água de coco (copo)', NULL::text, 7::numeric, 'Bebidas Não Alcoólicas'),
    ('Café expresso', NULL::text, 7::numeric, 'Bebidas Não Alcoólicas'),
    ('Sumo de limão', NULL::text, 2::numeric, 'Bebidas Não Alcoólicas'),
    ('Aperol Spritz', 'Espumante, Aperol e água com gás', 23::numeric, 'Drinks'),
    ('Caipirinha', NULL::text, 16::numeric, 'Drinks'),
    ('Caipirosca Absolut', NULL::text, 20::numeric, 'Drinks'),
    ('Caipirosca Ketel One', NULL::text, 19::numeric, 'Drinks'),
    ('Caipirosca Smirnoff', NULL::text, 18::numeric, 'Drinks'),
    ('Coquetel de Frutas', NULL::text, 15::numeric, 'Drinks'),
    ('Gin Tônica Abyssal', NULL::text, 18::numeric, 'Drinks'),
    ('Gin Tônica Tanqueray', NULL::text, 23::numeric, 'Drinks'),
    ('Johnnie Black Highball', 'Whisky, água de coco e tônica', 24::numeric, 'Drinks'),
    ('Johnnie Red Highball', 'Whisky, água de coco e tônica', 18::numeric, 'Drinks'),
    ('Moscow Mule', 'Vodka, limão-taiti e refrigerante artesanal de gengibre', 24::numeric, 'Drinks'),
    ('Tanqueray Tripel T', 'Gin, tangerina, mel e tônica', 24::numeric, 'Drinks'),
    ('BeerDock Blue', 'Vodka, Curaçau Blue e sumo de limão', 20::numeric, 'Drinks'),
    ('BeerDock Refresh', 'Vodka, água com gás, xarope de capim-santo e hortelã', 18::numeric, 'Drinks'),
    ('Mojito', 'Bacardi, soda, sumo de limão e hortelã', 23::numeric, 'Drinks'),
    ('Watermelon Gin', 'Gin, água com gás, purê de melancia e alecrim', 23::numeric, 'Drinks'),
    ('Apple Gin', 'Gin, xarope de limão verde e hortelã', 23::numeric, 'Drinks'),
    ('Margarita Blue', 'Tequila, Cointreau, Curaçau Blue e sal', 26::numeric, 'Drinks'),
    ('Margarita Tradicional', 'Tequila, Cointreau, sumo de limão e sal', 26::numeric, 'Drinks'),
    ('Tropical Gin', 'Gin, Red Bull tropical e laranja', 28::numeric, 'Drinks'),
    ('Bacardi', NULL::text, 8::numeric, 'Doses'),
    ('Baileys', NULL::text, 18::numeric, 'Doses'),
    ('Cointreau', NULL::text, 18::numeric, 'Doses'),
    ('Combo Gin Tanqueray (750ml + 6 tônicas)', NULL::text, 250::numeric, 'Doses'),
    ('Gin Abyssal', NULL::text, 12::numeric, 'Doses'),
    ('Gin Hendrick''s', NULL::text, 32::numeric, 'Doses'),
    ('Gin Tanqueray', NULL::text, 20::numeric, 'Doses'),
    ('Vodka Absolut', NULL::text, 14::numeric, 'Doses'),
    ('Vodka Ketel One', NULL::text, 12::numeric, 'Doses'),
    ('Vodka Smirnoff', NULL::text, 8::numeric, 'Doses'),
    ('Tequila Jose Cuervo', NULL::text, 13::numeric, 'Doses'),
    ('Johnnie Walker Red Label (50ml)', NULL::text, 14::numeric, 'Whiskies'),
    ('Johnnie Walker Red Label (litro)', NULL::text, 140::numeric, 'Whiskies'),
    ('Johnnie Walker Black Label (50ml)', NULL::text, 20::numeric, 'Whiskies'),
    ('Johnnie Walker Black Label (litro)', NULL::text, 220::numeric, 'Whiskies'),
    ('Logan (50ml)', NULL::text, 20::numeric, 'Whiskies'),
    ('Logan (litro)', NULL::text, 165::numeric, 'Whiskies'),
    ('Old Parr (50ml)', NULL::text, 21::numeric, 'Whiskies'),
    ('Old Parr (litro)', NULL::text, 210::numeric, 'Whiskies'),
    ('Jack Daniel''s (50ml)', NULL::text, 17::numeric, 'Whiskies'),
    ('Jack Daniel''s (litro)', NULL::text, 180::numeric, 'Whiskies')
),
updated_rows AS (
  UPDATE public.products AS products
  SET
    category = 'bebida',
    subcategory = bebida_items.subcategory,
    description = bebida_items.description,
    price = bebida_items.price,
    active = true,
    available = true,
    updated_at = timezone('utc', now())
  FROM bebida_items
  WHERE products.company_id = 'f85bfdc2-982a-4cf7-b176-bce68426f861'
    AND lower(trim(products.name)) = lower(trim(bebida_items.name))
    AND lower(COALESCE(products.category, '')) IN ('bebida', 'bebidas')
  RETURNING lower(trim(products.name)) AS normalized_name
)
INSERT INTO public.products (
  company_id,
  name,
  description,
  price,
  category,
  subcategory,
  active,
  available,
  created_at,
  updated_at
)
SELECT
  'f85bfdc2-982a-4cf7-b176-bce68426f861'::uuid,
  bebida_items.name,
  bebida_items.description,
  bebida_items.price,
  'bebida',
  bebida_items.subcategory,
  true,
  true,
  timezone('utc', now()),
  timezone('utc', now())
FROM bebida_items
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products AS products
  WHERE products.company_id = 'f85bfdc2-982a-4cf7-b176-bce68426f861'
    AND lower(trim(products.name)) = lower(trim(bebida_items.name))
    AND lower(COALESCE(products.category, '')) IN ('bebida', 'bebidas')
);

COMMIT;
