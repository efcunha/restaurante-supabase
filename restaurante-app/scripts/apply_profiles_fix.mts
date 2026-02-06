#!/usr/bin/env node
/**
 * Script to add missing fields to profiles table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔧 Adding missing fields to profiles table...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addFields() {
  const queries = [
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text;",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date;",
    "CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);",
    "CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);"
  ];

  for (const query of queries) {
    console.log(`📝 Executing: ${query.substring(0, 60)}...`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.log(`⚠️  RPC error (trying alternative): ${error.message}`);
        // Alternative: use raw SQL if RPC doesn't work
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql_query: query })
        });
        
        if (!response.ok) {
          const text = await response.text();
          console.log(`⚠️  HTTP error: ${text}`);
        } else {
          console.log('✅ Success (via HTTP)');
        }
      } else {
        console.log('✅ Success');
      }
    } catch (err: any) {
      console.log(`⚠️  Error: ${err.message}`);
    }
  }

  // Verify
  console.log('\n🔍 Verifying changes...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Verification error:', error.message);
  } else {
    console.log('✅ Profiles table verified');
    if (data && data.length > 0) {
      console.log('📋 Columns:', Object.keys(data[0]).join(', '));
    }
  }

  console.log('\n✨ Done!');
}

addFields().catch(console.error);
