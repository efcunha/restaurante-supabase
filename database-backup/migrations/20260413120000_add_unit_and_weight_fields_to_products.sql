-- Add measurement unit and weight-selling flag to products table
-- This enables the peso/balanca feature for items like bulk items

ALTER TABLE "public"."products" 
ADD COLUMN IF NOT EXISTS "unit" text DEFAULT 'un',
ADD COLUMN IF NOT EXISTS "vendido_por_peso" boolean DEFAULT false;

-- Create index for weight-selling flag queries
CREATE INDEX IF NOT EXISTS idx_products_vendido_por_peso 
  ON "public"."products"("company_id", "vendido_por_peso", "available");
