-- Migration: fix product_adicionais unico max_choices and trigger propagation strategy
-- Problem: trigger used MIN()-based consensus which caused race conditions during parallel
--          Promise.all updates (selection_type='unico' left max_choices=1, so MIN(3,1,1)=1
--          reverted multiplo/3 back to 1).
-- Fix 1: set max_choices = NULL for 'unico' rows (max_choices has no meaning when single choice).
-- Fix 2: replace trigger logic from "consensus MIN" to "propagate from NEW" for INSERT/UPDATE,
--        keeping MIN-based recompute only for DELETE (where NEW is not available).

BEGIN;

-- NOTE: Cleanup (step 1) intentionally runs AFTER the new trigger is installed (step 2).
-- Running the cleanup before installing the new trigger would have the OLD trigger fire and
-- re-set max_choices back to 1 (its CASE WHEN 'unico' THEN 1 logic).

-- 1) Replace the trigger function with "propagate from NEW" strategy.
CREATE OR REPLACE FUNCTION public.normalize_product_adicionais_constraints()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id uuid;
  v_product_id uuid;
  v_category   text;
  v_selection_type text;
  v_max_choices    integer;
BEGIN
  -- Guard: prevent recursive trigger firing from our own UPDATE below.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- On delete, recompute consensus for the affected category (no NEW row available).
    v_company_id := OLD.company_id;
    v_product_id := OLD.product_id;
    v_category   := OLD.category;

    WITH category_rules AS (
      SELECT
        CASE
          WHEN bool_and(pa.selection_type = 'unico') THEN 'unico'
          ELSE 'multiplo'
        END AS effective_selection_type,
        MIN(CASE WHEN pa.max_choices >= 1 THEN pa.max_choices END) AS effective_max_choices
      FROM public.product_adicionais AS pa
      WHERE pa.company_id = v_company_id
        AND pa.product_id = v_product_id
        AND pa.category   = v_category
    )
    UPDATE public.product_adicionais AS pa
    SET
      selection_type = cr.effective_selection_type,
      max_choices = CASE
        WHEN cr.effective_selection_type = 'unico' THEN NULL
        ELSE cr.effective_max_choices
      END
    FROM category_rules AS cr
    WHERE pa.company_id = v_company_id
      AND pa.product_id = v_product_id
      AND pa.category   = v_category
      AND (
        pa.selection_type IS DISTINCT FROM cr.effective_selection_type
        OR pa.max_choices IS DISTINCT FROM (
          CASE
            WHEN cr.effective_selection_type = 'unico' THEN NULL
            ELSE cr.effective_max_choices
          END
        )
      );

    RETURN NULL;
  END IF;

  -- INSERT or UPDATE: propagate NEW values to all siblings in the same category.
  -- This avoids the intermediate-state race condition of the MIN-based approach.
  v_company_id     := NEW.company_id;
  v_product_id     := NEW.product_id;
  v_category       := NEW.category;
  v_selection_type := NEW.selection_type;
  -- unico always stores NULL for max_choices.
  v_max_choices    := CASE WHEN NEW.selection_type = 'unico' THEN NULL ELSE NEW.max_choices END;

  UPDATE public.product_adicionais
  SET
    selection_type = v_selection_type,
    max_choices    = v_max_choices
  WHERE company_id = v_company_id
    AND product_id = v_product_id
    AND category   = v_category
    AND id        <> NEW.id
    AND (
      selection_type IS DISTINCT FROM v_selection_type
      OR max_choices IS DISTINCT FROM v_max_choices
    );

  -- Also ensure the triggering row itself has the correct max_choices for unico.
  IF NEW.selection_type = 'unico' AND NEW.max_choices IS NOT NULL THEN
    UPDATE public.product_adicionais
    SET max_choices = NULL
    WHERE id = NEW.id;
  END IF;

  RETURN NULL;
END;
$$;

-- Recreate trigger (already AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW).
DROP TRIGGER IF EXISTS trg_normalize_product_adicionais_constraints ON public.product_adicionais;

CREATE TRIGGER trg_normalize_product_adicionais_constraints
AFTER INSERT OR UPDATE OR DELETE ON public.product_adicionais
FOR EACH ROW
EXECUTE FUNCTION public.normalize_product_adicionais_constraints();

-- 2) Clean up residual max_choices=N on unico rows in production.
-- Now that the new trigger is installed, this UPDATE will propagate max_choices=NULL
-- to all siblings correctly (the new trigger propagates from NEW, not MIN-based).
UPDATE public.product_adicionais
SET max_choices = NULL
WHERE selection_type = 'unico'
  AND max_choices IS NOT NULL;

COMMIT;
