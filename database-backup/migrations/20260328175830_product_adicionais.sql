-- Migration: product_adicionais
-- Cria tabela de adicionais por produto (categoria porcao) com RLS multi-tenant
-- Incl. seed dos 15 adicionais para "Batata Frita" da company de desenvolvimento

-- ============================================================
-- TABELA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_adicionais (
    id              uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name            text NOT NULL,
    description     text,
    price           numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    category        text NOT NULL DEFAULT 'extras'
                        CHECK (category IN ('molhos', 'extras', 'toppings')),
    selection_type  text NOT NULL DEFAULT 'multiplo'
                        CHECK (selection_type IN ('unico', 'multiplo')),
    max_choices     integer,          -- NULL = sem limite
    display_order   integer NOT NULL DEFAULT 0,
    active          boolean NOT NULL DEFAULT true,
    created_at      timestamp with time zone DEFAULT now() NOT NULL,
    updated_at      timestamp with time zone DEFAULT now(),
    CONSTRAINT product_adicionais_pkey PRIMARY KEY (id)
);

ALTER TABLE public.product_adicionais OWNER TO postgres;

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_adicionais_product_id
    ON public.product_adicionais (product_id);

CREATE INDEX IF NOT EXISTS idx_product_adicionais_company_id
    ON public.product_adicionais (company_id);

-- Trigger updated_at (reutiliza função existente)
CREATE TRIGGER set_product_adicionais_updated_at
    BEFORE UPDATE ON public.product_adicionais
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.product_adicionais ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado da mesma empresa
CREATE POLICY "product_adicionais_select"
    ON public.product_adicionais
    FOR SELECT
    USING (company_id = public.get_my_company_id());

-- Escrita: somente admin/gerente da mesma empresa
CREATE POLICY "product_adicionais_insert"
    ON public.product_adicionais
    FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin', 'gerente')
    );

CREATE POLICY "product_adicionais_update"
    ON public.product_adicionais
    FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin', 'gerente')
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin', 'gerente')
    );

CREATE POLICY "product_adicionais_delete"
    ON public.product_adicionais
    FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin', 'gerente')
    );

-- ============================================================
-- SEED — 15 adicionais para "Batata Frita"
-- Inserção condicional: só insere se o produto existir e não houver
-- adicionais já cadastrados para ele (prevenção de duplicata em replay)
-- ============================================================

DO $$
DECLARE
    v_product_id uuid;
    v_company_id uuid;
BEGIN
    -- Busca o produto "Batata Frita" na empresa que o possui
    -- Usa LIMIT 1 por segurança (pode haver múltiplas empresas)
    SELECT p.id, p.company_id
      INTO v_product_id, v_company_id
      FROM public.products p
     WHERE p.name = 'Batata Frita'
       AND p.category = 'porcao'
     ORDER BY p.created_at
     LIMIT 1;

    -- Se não encontrou o produto, pula silenciosamente
    IF v_product_id IS NULL THEN
        RAISE NOTICE 'Seed product_adicionais: Batata Frita não encontrada — seed ignorado.';
        RETURN;
    END IF;

    -- Se já existem adicionais cadastrados, não duplicar
    IF EXISTS (
        SELECT 1 FROM public.product_adicionais
         WHERE product_id = v_product_id
    ) THEN
        RAISE NOTICE 'Seed product_adicionais: adicionais já existem para Batata Frita — seed ignorado.';
        RETURN;
    END IF;

    -- ─── MOLHOS (selection_type = 'unico') ────────────────────────────
    INSERT INTO public.product_adicionais
        (company_id, product_id, name, description, price, category, selection_type, max_choices, display_order)
    VALUES
        (v_company_id, v_product_id, 'Ketchup',            'Molho de tomate clássico',             0.00, 'molhos', 'unico', 1, 1),
        (v_company_id, v_product_id, 'Maionese',           'Maionese tradicional',                 0.00, 'molhos', 'unico', 1, 2),
        (v_company_id, v_product_id, 'Mostarda',           'Mostarda amarela clássica',            0.00, 'molhos', 'unico', 1, 3),
        (v_company_id, v_product_id, 'Molho barbecue',     'Molho defumado adocicado',             2.00, 'molhos', 'unico', 1, 4),
        (v_company_id, v_product_id, 'Cheddar',            'Molho cheddar cremoso',                3.00, 'molhos', 'unico', 1, 5),
        (v_company_id, v_product_id, 'Catupiry',           'Creme de queijo Catupiry',             3.50, 'molhos', 'unico', 1, 6),
        (v_company_id, v_product_id, 'Maionese temperada', 'Maionese com temperos especiais',      2.50, 'molhos', 'unico', 1, 7);

    -- ─── EXTRAS (selection_type = 'multiplo') ─────────────────────────
    INSERT INTO public.product_adicionais
        (company_id, product_id, name, description, price, category, selection_type, max_choices, display_order)
    VALUES
        (v_company_id, v_product_id, 'Bacon',          'Tiras de bacon crocante',         5.00, 'extras', 'multiplo', NULL, 10),
        (v_company_id, v_product_id, 'Calabresa',      'Rodelas de calabresa grelhada',   4.50, 'extras', 'multiplo', NULL, 11),
        (v_company_id, v_product_id, 'Frango desfiado','Frango desfiado temperado',       5.50, 'extras', 'multiplo', NULL, 12),
        (v_company_id, v_product_id, 'Carne moída',    'Carne moída temperada',           6.00, 'extras', 'multiplo', NULL, 13),
        (v_company_id, v_product_id, 'Queijo muçarela','Queijo muçarela derretido',       4.00, 'extras', 'multiplo', NULL, 14);

    -- ─── TOPPINGS (selection_type = 'multiplo', max_choices = 1) ──────
    INSERT INTO public.product_adicionais
        (company_id, product_id, name, description, price, category, selection_type, max_choices, display_order)
    VALUES
        (v_company_id, v_product_id, 'Cheddar com bacon',    'Dupla especial: cheddar + bacon',          7.00, 'toppings', 'multiplo', 1, 20),
        (v_company_id, v_product_id, 'Catupiry com frango',  'Catupiry + frango desfiado',               7.50, 'toppings', 'multiplo', 1, 21),
        (v_company_id, v_product_id, 'Picanha',              'Fatias de picanha ao ponto',              10.00, 'toppings', 'multiplo', 1, 22),
        (v_company_id, v_product_id, 'Costela desfiada',     'Costela bovina desfiada na brasa',         9.00, 'toppings', 'multiplo', 1, 23);

    RAISE NOTICE 'Seed product_adicionais: 15 adicionais inseridos para Batata Frita (product_id: %).', v_product_id;
END;
$$;
