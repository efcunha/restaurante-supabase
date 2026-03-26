-- Migration: fix_anon_products_rls_and_storage
-- Date: 2026-03-26
-- Purpose:
--   1. Corrige "menu vazio no celular" — a policy public_menu_products_read usa
--      EXISTS em companies, mas anon não tem policy de SELECT em companies (foi
--      removida em 20260325180000). Solução: helper SECURITY DEFINER para o check.
--   2. Cria bucket menu-images no Supabase Storage com policies por company_id.

-- ============================================================
-- 1. HELPER: is_company_menu_published (SECURITY DEFINER)
--    Chamada dentro da policy RLS — escapa corretamente do isolamento
--    do usuário anon para verificar se a empresa tem menu publicado.
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."is_company_menu_published"("p_company_id" uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id
      AND c.menu_published = true
      AND c.active = true
  );
$$;

-- Conceder execute apenas a anon e authenticated (não ampliar para funções internas)
GRANT EXECUTE ON FUNCTION "public"."is_company_menu_published"(uuid) TO anon;
GRANT EXECUTE ON FUNCTION "public"."is_company_menu_published"(uuid) TO authenticated;

COMMENT ON FUNCTION "public"."is_company_menu_published"(uuid) IS
  'Verifica se empresa tem menu publicado. SECURITY DEFINER para uso em policies RLS
   onde anon não pode consultar a tabela companies diretamente (policy removida por
   segurança em 20260325180000). SET search_path = public previne search_path injection.';

-- ============================================================
-- 2. CORRIGIR public_menu_products_read
--    A policy anterior usa EXISTS(SELECT ... FROM companies) que sempre retorna
--    false para anon pois não há policy SELECT em companies para anon.
--    Substituir pelo helper SECURITY DEFINER acima.
-- ============================================================
DROP POLICY IF EXISTS "public_menu_products_read" ON "public"."products";

CREATE POLICY "public_menu_products_read"
  ON "public"."products"
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (
    available = true
    AND active = true
    AND public.is_company_menu_published(company_id)
  );

COMMENT ON POLICY "public_menu_products_read" ON "public"."products" IS
  'Permite anon ler produtos disponíveis de empresas com menu publicado.
   Usa helper SECURITY DEFINER para verificar companies sem policy SELECT direta.';

-- ============================================================
-- 3. STORAGE: bucket menu-images
--    Bucket público de leitura — imagens do cardápio digital precisam ser
--    acessíveis anonimamente (clientes no celular).
--    Escrita restrita por company_id via policy.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,          -- público para leitura (necessário para página do cardápio)
  5242880,       -- 5 MB por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================================
-- 4. STORAGE POLICIES em storage.objects
-- ============================================================

-- Leitura pública do bucket (bucket já é public=true, mas policy explícita é boa prática)
DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
CREATE POLICY "menu_images_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'menu-images');

-- Upload: authenticated somente para sua própria empresa
-- Path esperado: {company_id}/{product_id}/foto.ext
DROP POLICY IF EXISTS "menu_images_upload" ON storage.objects;
CREATE POLICY "menu_images_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (storage.foldername(name))[1] = (
      SELECT p.company_id::text
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Update/upsert: mesma restrição de company_id
DROP POLICY IF EXISTS "menu_images_update" ON storage.objects;
CREATE POLICY "menu_images_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (storage.foldername(name))[1] = (
      SELECT p.company_id::text
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Delete: mesma restrição de company_id (admins podem remover fotos da sua empresa)
DROP POLICY IF EXISTS "menu_images_delete" ON storage.objects;
CREATE POLICY "menu_images_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (storage.foldername(name))[1] = (
      SELECT p.company_id::text
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================================
-- VERIFICAÇÃO RÁPIDA (comentada — para revisão manual)
-- ============================================================
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name = 'is_company_menu_published';
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'products'
--   AND policyname = 'public_menu_products_read';
--
-- SELECT id, name, public FROM storage.buckets WHERE id = 'menu-images';
