-- Seed dynamic pizza subcategories in companies.settings for companies
-- without pizzaSubcategories configured yet.

BEGIN;

UPDATE public.companies
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{pizzaSubcategories}',
    '["Tradicional","Especiais","Doces"]'::jsonb,
    true
  ),
  updated_at = NOW()
WHERE settings IS NULL
   OR jsonb_typeof(settings -> 'pizzaSubcategories') <> 'array'
   OR jsonb_array_length(COALESCE(settings -> 'pizzaSubcategories', '[]'::jsonb)) = 0;

COMMIT;
