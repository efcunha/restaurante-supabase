-- Create inventory table if not exists
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC DEFAULT 0,
    min_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies just in case
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users based on company_id" ON public.inventory
    FOR ALL
    TO authenticated
    USING (company_id = (select company_id from profiles where id = auth.uid()))
    WITH CHECK (company_id = (select company_id from profiles where id = auth.uid()));
