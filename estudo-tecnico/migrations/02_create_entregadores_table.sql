-- ============================================================================
-- Migration: 02_create_entregadores_table.sql
-- Description: Cria tabela de entregadores e configurações relacionadas
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Criar tabela de entregadores
CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'carro', 'bicicleta', 'a_pe')),
  vehicle_plate TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  max_deliveries_per_day INTEGER DEFAULT 50,
  current_deliveries_today INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  total_deliveries INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT entregadores_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Comentários na tabela e colunas
COMMENT ON TABLE public.entregadores IS 'Cadastro de entregadores/motoboys para delivery';
COMMENT ON COLUMN public.entregadores.company_id IS 'ID da empresa (multi-tenant)';
COMMENT ON COLUMN public.entregadores.name IS 'Nome completo do entregador';
COMMENT ON COLUMN public.entregadores.phone IS 'Telefone de contato';
COMMENT ON COLUMN public.entregadores.cpf IS 'CPF do entregador';
COMMENT ON COLUMN public.entregadores.vehicle_type IS 'Tipo de veículo: moto, carro, bicicleta, a_pe';
COMMENT ON COLUMN public.entregadores.vehicle_plate IS 'Placa do veículo (se aplicável)';
COMMENT ON COLUMN public.entregadores.active IS 'Se o entregador está ativo e disponível';
COMMENT ON COLUMN public.entregadores.max_deliveries_per_day IS 'Limite máximo de entregas por dia';
COMMENT ON COLUMN public.entregadores.current_deliveries_today IS 'Contador de entregas realizadas hoje';
COMMENT ON COLUMN public.entregadores.rating IS 'Avaliação média do entregador (0-5)';
COMMENT ON COLUMN public.entregadores.total_deliveries IS 'Total de entregas realizadas (histórico)';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_entregadores_company 
ON public.entregadores(company_id);

CREATE INDEX IF NOT EXISTS idx_entregadores_active 
ON public.entregadores(company_id, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_entregadores_phone 
ON public.entregadores(phone) 
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entregadores_cpf 
ON public.entregadores(cpf) 
WHERE cpf IS NOT NULL;

COMMENT ON INDEX public.idx_entregadores_company IS 'Índice para filtrar entregadores por empresa';
COMMENT ON INDEX public.idx_entregadores_active IS 'Índice parcial para entregadores ativos';
COMMENT ON INDEX public.idx_entregadores_phone IS 'Índice para busca por telefone';
COMMENT ON INDEX public.idx_entregadores_cpf IS 'Índice para busca por CPF';

-- Adicionar Foreign Key na tabela orders (se ainda não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_delivery_person_id_fkey'
  ) THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_delivery_person_id_fkey 
    FOREIGN KEY (delivery_person_id) 
    REFERENCES public.entregadores(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_entregadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_entregadores_updated_at ON public.entregadores;
CREATE TRIGGER trigger_update_entregadores_updated_at
  BEFORE UPDATE ON public.entregadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_entregadores_updated_at();

-- Trigger para resetar contador diário de entregas à meia-noite
CREATE OR REPLACE FUNCTION public.reset_daily_delivery_counter()
RETURNS void AS $$
BEGIN
  UPDATE public.entregadores 
  SET current_deliveries_today = 0
  WHERE current_deliveries_today > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reset_daily_delivery_counter() IS 'Reseta o contador diário de entregas (executar via cron à meia-noite)';

-- RLS Policies para entregadores
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver entregadores da própria empresa
DROP POLICY IF EXISTS "Users can view entregadores from their company" ON public.entregadores;
CREATE POLICY "Users can view entregadores from their company"
  ON public.entregadores
  FOR SELECT
  USING (company_id = public.get_my_company_id());

-- Policy: Admins e Managers podem inserir entregadores
DROP POLICY IF EXISTS "Admins and managers can insert entregadores" ON public.entregadores;
CREATE POLICY "Admins and managers can insert entregadores"
  ON public.entregadores
  FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id() 
    AND public.is_admin_or_manager()
  );

-- Policy: Admins e Managers podem atualizar entregadores
DROP POLICY IF EXISTS "Admins and managers can update entregadores" ON public.entregadores;
CREATE POLICY "Admins and managers can update entregadores"
  ON public.entregadores
  FOR UPDATE
  USING (
    company_id = public.get_my_company_id() 
    AND public.is_admin_or_manager()
  );

-- Policy: Apenas Admins podem deletar entregadores
DROP POLICY IF EXISTS "Only admins can delete entregadores" ON public.entregadores;
CREATE POLICY "Only admins can delete entregadores"
  ON public.entregadores
  FOR DELETE
  USING (
    company_id = public.get_my_company_id() 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- ROLLBACK (caso necessário reverter)
-- ============================================================================
/*
DROP POLICY IF EXISTS "Only admins can delete entregadores" ON public.entregadores;
DROP POLICY IF EXISTS "Admins and managers can update entregadores" ON public.entregadores;
DROP POLICY IF EXISTS "Admins and managers can insert entregadores" ON public.entregadores;
DROP POLICY IF EXISTS "Users can view entregadores from their company" ON public.entregadores;

DROP TRIGGER IF EXISTS trigger_update_entregadores_updated_at ON public.entregadores;
DROP FUNCTION IF EXISTS public.update_entregadores_updated_at();
DROP FUNCTION IF EXISTS public.reset_daily_delivery_counter();

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_person_id_fkey;

DROP INDEX IF EXISTS public.idx_entregadores_cpf;
DROP INDEX IF EXISTS public.idx_entregadores_phone;
DROP INDEX IF EXISTS public.idx_entregadores_active;
DROP INDEX IF EXISTS public.idx_entregadores_company;

DROP TABLE IF EXISTS public.entregadores;
*/
