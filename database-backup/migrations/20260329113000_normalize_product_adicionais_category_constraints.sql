-- Migration: normalize product_adicionais category constraints
-- Goal: keep selection_type and max_choices consistent per company/product/category.

BEGIN;

-- 1) Guardrail for invalid values.
UPDATE public.product_adicionais
SET max_choices = NULL
WHERE max_choices IS NOT NULL
  AND max_choices < 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_adicionais_max_choices_positive'
      AND conrelid = 'public.product_adicionais'::regclass
  ) THEN
    ALTER TABLE public.product_adicionais
      ADD CONSTRAINT product_adicionais_max_choices_positive
      CHECK (max_choices IS NULL OR max_choices >= 1);
  END IF;
END;
$$;

-- 2) One-time normalization for existing rows (fail-safe by smallest positive max_choices).
WITH category_rules AS (
  SELECT
    company_id,
    product_id,
    category,
    CASE
      WHEN bool_and(selection_type = 'unico') THEN 'unico'
      ELSE 'multiplo'
    END AS effective_selection_type,
    MIN(CASE WHEN max_choices >= 1 THEN max_choices END) AS effective_max_choices
  FROM public.product_adicionais
  GROUP BY company_id, product_id, category
)
UPDATE public.product_adicionais AS pa
SET
  selection_type = cr.effective_selection_type,
  max_choices = CASE
    WHEN cr.effective_selection_type = 'unico' THEN 1
    ELSE cr.effective_max_choices
  END
FROM category_rules AS cr
WHERE pa.company_id = cr.company_id
  AND pa.product_id = cr.product_id
  AND pa.category = cr.category
  AND (
    pa.selection_type IS DISTINCT FROM cr.effective_selection_type
    OR pa.max_choices IS DISTINCT FROM (
      CASE
        WHEN cr.effective_selection_type = 'unico' THEN 1
        ELSE cr.effective_max_choices
      END
    )
  );

-- 3) Triggered normalization to prevent future drift caused by item-level writes.
CREATE OR REPLACE FUNCTION public.normalize_product_adicionais_constraints()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_company_id uuid;
  v_old_product_id uuid;
  v_old_category text;
  v_new_company_id uuid;
  v_new_product_id uuid;
  v_new_category text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  v_old_company_id := COALESCE(OLD.company_id, NULL);
  v_old_product_id := COALESCE(OLD.product_id, NULL);
  v_old_category := COALESCE(OLD.category, NULL);

  v_new_company_id := COALESCE(NEW.company_id, NULL);
  v_new_product_id := COALESCE(NEW.product_id, NULL);
  v_new_category := COALESCE(NEW.category, NULL);

  WITH targets AS (
    SELECT DISTINCT company_id, product_id, category
    FROM (
      SELECT v_old_company_id AS company_id, v_old_product_id AS product_id, v_old_category AS category
      UNION ALL
      SELECT v_new_company_id AS company_id, v_new_product_id AS product_id, v_new_category AS category
    ) AS t
    WHERE company_id IS NOT NULL
      AND product_id IS NOT NULL
      AND category IS NOT NULL
  ),
  category_rules AS (
    SELECT
      pa.company_id,
      pa.product_id,
      pa.category,
      CASE
        WHEN bool_and(pa.selection_type = 'unico') THEN 'unico'
        ELSE 'multiplo'
      END AS effective_selection_type,
      MIN(CASE WHEN pa.max_choices >= 1 THEN pa.max_choices END) AS effective_max_choices
    FROM public.product_adicionais AS pa
    INNER JOIN targets AS t
      ON t.company_id = pa.company_id
     AND t.product_id = pa.product_id
     AND t.category = pa.category
    GROUP BY pa.company_id, pa.product_id, pa.category
  )
  UPDATE public.product_adicionais AS pa
  SET
    selection_type = cr.effective_selection_type,
    max_choices = CASE
      WHEN cr.effective_selection_type = 'unico' THEN 1
      ELSE cr.effective_max_choices
    END
  FROM category_rules AS cr
  WHERE pa.company_id = cr.company_id
    AND pa.product_id = cr.product_id
    AND pa.category = cr.category
    AND (
      pa.selection_type IS DISTINCT FROM cr.effective_selection_type
      OR pa.max_choices IS DISTINCT FROM (
        CASE
          WHEN cr.effective_selection_type = 'unico' THEN 1
          ELSE cr.effective_max_choices
        END
      )
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_product_adicionais_constraints ON public.product_adicionais;

CREATE TRIGGER trg_normalize_product_adicionais_constraints
AFTER INSERT OR UPDATE OR DELETE ON public.product_adicionais
FOR EACH ROW
EXECUTE FUNCTION public.normalize_product_adicionais_constraints();

COMMIT;
