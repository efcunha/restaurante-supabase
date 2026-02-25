-- Seed Script for Test Database
-- Run this in the Supabase SQL Editor

-- 1. Create Test Company (if not exists)
DO $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (
            name, 
            document, 
            document_type, 
            active, 
            settings
        ) VALUES (
            'Test Company', 
            '00000000000000', 
            'cnpj', 
            true, 
            '{}'::jsonb
        ) RETURNING id INTO v_company_id;
        RAISE NOTICE 'Created Company: %', v_company_id;
    ELSE
        RAISE NOTICE 'Using Existing Company: %', v_company_id;
    END IF;

    -- 2. Create Test User (if not exists)
    -- Note: We cannot easily create auth.users via SQL in all environments due to permissions,
    -- but we can ensure the PROFILE exists if the user ID is known.
    -- However, for integration tests, we need a specific user.
    -- The best way is to insert into auth.users if we have permissions, or just assume the user exists
    -- and link them.
    
    -- Let's try to simulate the user creation if possible, or just insert the profile 
    -- linking to a known ID if you have one. 
    -- Since we can't reliably create auth users via simple SQL without extension privileges,
    -- checks are limited.
    
    -- FOR THIS TEST: We will just ensure a profile is linked to the company for ANY existing user,
    -- or create a placeholder if possible.
    
    -- Simplest approach for "permission denied" issues:
    -- Update ALL existing profiles to belong to this company (dangerous in prod, OK in test DB)
    UPDATE public.profiles SET company_id = v_company_id WHERE company_id IS NULL;
    
    -- Insert a profile for the specific test user ID expected by tests if known?
    -- The tests dynamically fetch a user.
    -- "const { data: existingProfile } = await supabase.from('profiles').select..."
    
    -- If no profile exists at all, we need one.
    IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
         -- We need a user ID. 
         -- If auth.users has entries, pick one.
         DECLARE
            v_user_id uuid;
         BEGIN
             SELECT id INTO v_user_id FROM auth.users LIMIT 1;
             
             IF v_user_id IS NOT NULL THEN
                 INSERT INTO public.profiles (id, company_id, email, full_name, role, active)
                 VALUES (v_user_id, v_company_id, 'test@example.com', 'Test User', 'admin', true);
                 RAISE NOTICE 'Created Profile for User: %', v_user_id;
             ELSE
                 RAISE NOTICE 'No users found in auth.users. Please sign up a user manually in the Authentication tab first.';
             END IF;
         END;
    END IF;

END $$;
