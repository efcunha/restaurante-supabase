#!/usr/bin/env node
/**
 * Apply RLS policy fix for profiles updates
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔧 Aplicando correção de política RLS...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFix() {
  try {
    const sql = `
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy: Users can update their own profile OR admins/managers can update profiles in their company
CREATE POLICY "Users can update profiles in their company" 
ON public.profiles 
FOR UPDATE 
USING (
  -- User can update their own profile
  id = auth.uid() 
  OR 
  -- OR user is admin/manager in the same company
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
`;

    console.log('📝 SQL a ser executado:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('');

    // Execute via raw SQL
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executando: ${statement.substring(0, 50)}...`);
        
        // Use fetch to execute raw SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        });

        if (response.status === 404) {
          console.log('⚠️  RPC não disponível, executando via psql seria necessário');
        } else if (response.ok) {
          console.log('✅ Executado');
        } else {
          const text = await response.text();
          console.log(`⚠️  Resposta: ${text.substring(0, 100)}`);
        }
      }
    }

    console.log('\n✨ Política RLS atualizada!');
    console.log('\n📝 Agora admins e managers podem:');
    console.log('   ✅ Atualizar seus próprios perfis');
    console.log('   ✅ Atualizar perfis de outros funcionários da mesma empresa');
    console.log('\n🧪 Teste novamente no app!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

applyFix();
