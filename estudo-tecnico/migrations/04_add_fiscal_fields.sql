-- ============================================================================
-- Migration: 04_add_fiscal_fields.sql
-- Description: Adiciona campos fiscais para emissão de NFC-e/NF-e
-- Author: Sistema
-- Date: 2026-02-11
-- ============================================================================

-- Adicionar coluna ncm (Nomenclatura Comum do Mercosul)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'ncm'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN ncm TEXT;
    
    COMMENT ON COLUMN public.products.ncm IS 'Código NCM (Nomenclatura Comum do Mercosul) - 8 dígitos';
  END IF;
END $$;

-- Adicionar coluna cfop (Código Fiscal de Operações e Prestações)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cfop'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN cfop TEXT;
    
    COMMENT ON COLUMN public.products.cfop IS 'CFOP padrão para o produto (ex: 5102 - Venda de mercadoria)';
  END IF;
END $$;

-- Adicionar coluna tax_rate (alíquota de imposto)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 0.00;
    
    COMMENT ON COLUMN public.products.tax_rate IS 'Alíquota de imposto em percentual (ex: 18.00 para 18%)';
  END IF;
END $$;

-- Adicionar coluna cest (Código Especificador da Substituição Tributária)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cest'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN cest TEXT;
    
    COMMENT ON COLUMN public.products.cest IS 'Código CEST para produtos sujeitos à substituição tributária';
  END IF;
END $$;

-- Adicionar coluna origem (origem da mercadoria)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'origem'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN origem INTEGER 
    CHECK (origem BETWEEN 0 AND 8)
    DEFAULT 0;
    
    COMMENT ON COLUMN public.products.origem IS 'Origem da mercadoria: 0=Nacional, 1=Estrangeira importação direta, etc';
  END IF;
END $$;

-- Criar tabela de notas fiscais emitidas
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  numero_nota TEXT NOT NULL,
  serie TEXT DEFAULT '1',
  chave_acesso TEXT UNIQUE,
  tipo TEXT CHECK (tipo IN ('nfce', 'nfe', 'nfse')) DEFAULT 'nfce',
  status TEXT CHECK (status IN ('processando', 'autorizada', 'cancelada', 'rejeitada')) DEFAULT 'processando',
  valor_total NUMERIC(10,2) NOT NULL,
  valor_produtos NUMERIC(10,2) NOT NULL,
  valor_impostos NUMERIC(10,2) DEFAULT 0.00,
  cpf_cnpj_cliente TEXT,
  nome_cliente TEXT,
  xml_nota TEXT,
  pdf_url TEXT,
  qrcode_url TEXT,
  protocolo_autorizacao TEXT,
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  data_autorizacao TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  api_provider TEXT,
  api_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.notas_fiscais IS 'Registro de notas fiscais emitidas (NFC-e, NF-e, NFS-e)';
COMMENT ON COLUMN public.notas_fiscais.chave_acesso IS 'Chave de acesso da nota fiscal (44 dígitos)';
COMMENT ON COLUMN public.notas_fiscais.tipo IS 'Tipo de nota: nfce (cupom), nfe (eletrônica), nfse (serviço)';
COMMENT ON COLUMN public.notas_fiscais.status IS 'Status: processando, autorizada, cancelada, rejeitada';
COMMENT ON COLUMN public.notas_fiscais.api_provider IS 'Provedor da API fiscal: focus_nfe, enotas, webmania, etc';

-- Criar índices para notas fiscais
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_company 
ON public.notas_fiscais(company_id);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_order 
ON public.notas_fiscais(order_id);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status 
ON public.notas_fiscais(company_id, status);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data_emissao 
ON public.notas_fiscais(company_id, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_chave_acesso 
ON public.notas_fiscais(chave_acesso) 
WHERE chave_acesso IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_notas_fiscais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notas_fiscais_updated_at ON public.notas_fiscais;
CREATE TRIGGER trigger_update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notas_fiscais_updated_at();

-- RLS Policies para notas fiscais
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notas from their company" ON public.notas_fiscais;
CREATE POLICY "Users can view notas from their company"
  ON public.notas_fiscais
  FOR SELECT
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Admins and managers can insert notas" ON public.notas_fiscais;
CREATE POLICY "Admins and managers can insert notas"
  ON public.notas_fiscais
  FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id() 
    AND public.is_admin_or_manager()
  );

DROP POLICY IF EXISTS "System can update notas" ON public.notas_fiscais;
CREATE POLICY "System can update notas"
  ON public.notas_fiscais
  FOR UPDATE
  USING (company_id = public.get_my_company_id());

-- ============================================================================
-- ROLLBACK (caso necessário reverter)
-- ============================================================================
/*
DROP POLICY IF EXISTS "System can update notas" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Admins and managers can insert notas" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Users can view notas from their company" ON public.notas_fiscais;

DROP TRIGGER IF EXISTS trigger_update_notas_fiscais_updated_at ON public.notas_fiscais;
DROP FUNCTION IF EXISTS public.update_notas_fiscais_updated_at();

DROP INDEX IF EXISTS public.idx_notas_fiscais_chave_acesso;
DROP INDEX IF EXISTS public.idx_notas_fiscais_data_emissao;
DROP INDEX IF EXISTS public.idx_notas_fiscais_status;
DROP INDEX IF EXISTS public.idx_notas_fiscais_order;
DROP INDEX IF EXISTS public.idx_notas_fiscais_company;

DROP TABLE IF EXISTS public.notas_fiscais;

ALTER TABLE public.products DROP COLUMN IF EXISTS origem;
ALTER TABLE public.products DROP COLUMN IF EXISTS cest;
ALTER TABLE public.products DROP COLUMN IF EXISTS tax_rate;
ALTER TABLE public.products DROP COLUMN IF EXISTS cfop;
ALTER TABLE public.products DROP COLUMN IF EXISTS ncm;
*/
