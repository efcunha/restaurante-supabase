-- Seed dynamic menu categories in companies.settings for legacy companies
-- without categories configured yet.

BEGIN;

UPDATE public.companies
SET
  settings = jsonb_set(
    jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{categories}',
      '[
        {"slug":"caldo","name":"Caldos","order":1,"active":true},
        {"slug":"espetinho-simples","name":"Espetinho Simples","order":2,"active":true},
        {"slug":"espetinho-especial","name":"Espetinho Especial","order":3,"active":true},
        {"slug":"porcao","name":"Porcao","order":4,"active":true},
        {"slug":"bebida","name":"Bebida","order":5,"active":true},
        {"slug":"comida","name":"Comida","order":6,"active":true},
        {"slug":"pizza","name":"Pizza","order":7,"active":true},
        {"slug":"outro","name":"Outro","order":8,"active":true}
      ]'::jsonb,
      true
    ),
    '{categoryOrder}',
    '{
      "caldo":1,
      "espetinho-simples":2,
      "espetinho-especial":3,
      "porcao":4,
      "bebida":5,
      "comida":6,
      "pizza":7,
      "outro":8
    }'::jsonb,
    true
  ),
  updated_at = NOW()
WHERE settings IS NULL
   OR jsonb_typeof(settings -> 'categories') <> 'array'
   OR jsonb_array_length(COALESCE(settings -> 'categories', '[]'::jsonb)) = 0;

COMMIT;
