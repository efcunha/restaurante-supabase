-- Enforce that available = active on products table
-- Option A: available is always derived from active
-- When active changes, available must match

-- Add constraint to ensure available = active
ALTER TABLE "public"."products"
ADD CONSTRAINT "available_must_equal_active" 
CHECK ("active" = "available");

-- Ensure any existing mismatched rows are fixed before constraint enforcement
UPDATE "public"."products"
SET "available" = "active"
WHERE "active" <> "available";

-- Add comment for clarity
COMMENT ON CONSTRAINT "available_must_equal_active" ON "public"."products" 
IS 'Enforces that available column always equals active column. This ensures consistency: 
    active=true ⟷ available=true; active=false ⟷ available=false.
    UI should only expose active toggle; available is automatically synchronized.';
