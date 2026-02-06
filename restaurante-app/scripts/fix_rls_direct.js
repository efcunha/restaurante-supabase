#!/usr/bin/env node
/**
 * Fix RLS policy using direct PostgreSQL connection via Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔧 Corrigindo política RLS via service_role...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function fixRLS() {
  try {
    console.log('📝 Executando SQL via Supabase Management API...\n');

    // Try using the SQL endpoint directly
    const sqlStatements = [
      `DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles`,
      `CREATE POLICY "Users can update profiles in their company" ON public.profiles FOR UPDATE USING (id = auth.uid() OR (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))))`
    ];

    for (const sql of sqlStatements) {
      console.log(`Executando: ${sql.substring(0, 80)}...`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: sql })
        });

        console.log(`Status: ${response.status}`);
        
        if (!response.ok && response.status !== 404) {
          const text = await response.text();
          console.log(`Resposta: ${text.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`Erro: ${err.message}`);
      }
    }

    console.log('\n⚠️  Como o RPC não está disponível, você precisa executar o SQL manualmente:');
    console.log('\n📋 Copie e cole no Supabase Dashboard > SQL Editor:\n');
    console.log('─'.repeat(80));
    console.log(`
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update profiles in their company" 
ON public.profiles 
FOR UPDATE 
USING (
  id = auth.uid() 
  OR 
  (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
);
`);
    console.log('─'.repeat(80));
    console.log('\n🌐 Acesse: https://supabase.com/dashboard/project/ykalocfhnetxenvmtlcn/sql/new');
    console.log('\n✅ Depois de executar, teste novamente no app!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

fixRLS();
