-- Migration: add_public_menu_slug
-- Date: 2026-03-25
-- Purpose: Adiciona public_slug em companies para URL publica do cardapio QR
--          e RLS de leitura anonima de products para empresas publicadas.

-- ============================================================
-- 1. public_slug em companies
-- ============================================================

ALTER TABLE "public"."companies"
  ADD COLUMN IF NOT EXISTS "public_slug" text,
  ADD COLUMN IF NOT EXISTS "menu_published" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "menu_banner_url" text,
  ADD COLUMN IF NOT EXISTS "menu_logo_url" text,
  ADD COLUMN IF NOT EXISTS "menu_primary_color" text DEFAULT '#E85D04';

-- Slug unico globalmente (URL do cardapio publico)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_companies_public_slug"
  ON "public"."companies" ("public_slug")
  WHERE "public_slug" IS NOT NULL;

-- Index para lookup rapido por slug na rota publica
CREATE INDEX IF NOT EXISTS "idx_companies_menu_published"
  ON "public"."companies" ("menu_published")
  WHERE "menu_published" = true;

-- ============================================================
-- 2. display_order e photo_alt em products
-- ============================================================

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "photo_alt" text,
  ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}';

-- Index para ordenacao no cardapio publico
CREATE INDEX IF NOT EXISTS "idx_products_display_order"
  ON "public"."products" ("company_id", "category", "display_order");

-- ============================================================
-- 3. RLS: leitura publica de companies pelo slug
-- ============================================================

-- Permitir anon ler dados basicos de empresa publicada (via slug)
CREATE POLICY "public_menu_company_read"
  ON "public"."companies"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    "menu_published" = true
    AND "active" = true
    AND "public_slug" IS NOT NULL
  );

-- ============================================================
-- 4. RLS: leitura publica de products para empresas publicadas
-- ============================================================

-- Permitir anon ler produtos disponiveis de empresas com menu publicado
CREATE POLICY "public_menu_products_read"
  ON "public"."products"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    "available" = true
    AND "active" = true
    AND EXISTS (
      SELECT 1 FROM "public"."companies" c
      WHERE c."id" = "products"."company_id"
        AND c."menu_published" = true
        AND c."active" = true
    )
  );

-- ============================================================
-- 5. Funcao auxiliar: buscar empresa por slug (segura)
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_company_by_menu_slug"(slug_param text)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  address text,
  contact_phone text,
  menu_banner_url text,
  menu_logo_url text,
  menu_primary_color text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.city,
    c.address,
    c.contact_phone,
    c.menu_banner_url,
    c.menu_logo_url,
    c.menu_primary_color
  FROM public.companies c
  WHERE c.public_slug = slug_param
    AND c.menu_published = true
    AND c.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION "public"."get_company_by_menu_slug"(text) TO anon;
GRANT EXECUTE ON FUNCTION "public"."get_company_by_menu_slug"(text) TO authenticated;
