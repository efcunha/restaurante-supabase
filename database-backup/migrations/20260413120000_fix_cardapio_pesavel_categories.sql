-- Remapear categorias de produtos pesáveis para categorias válidas do sistema
-- Data: 2026-04-13

UPDATE products
SET category = CASE 
  WHEN category IN ('Carnes', 'Pratos Preparados') THEN 'comida'
  WHEN category IN ('Acompanhamentos', 'Bebidas/Frutas') THEN 'porcao'
  WHEN category IN ('Saladas') THEN 'porcao'
  ELSE 'outro'
END
WHERE company_id = 'f85bfdc2-982a-4cf7-b176-bce68426f861'
  AND vendido_por_peso = true;
