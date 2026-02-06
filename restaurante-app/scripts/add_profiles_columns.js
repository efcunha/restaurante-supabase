#!/usr/bin/env node
/**
 * Script to add missing fields to profiles table
 * Run with: node scripts/add_profiles_columns.js
 */

const { createClient } = require('@supabase/supabase-js');

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
    { sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;", desc: "Adding cpf column" },
    { sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;", desc: "Adding phone column" },
    { sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text;", desc: "Adding funcao column" },
    { sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;", desc: "Adding active column" },
    { sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date;", desc: "Adding hire_date column" },
    { sql: "CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);", desc: "Creating cpf index" },
    { sql: "CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);", desc: "Creating active index" }
  ];

  console.log('📝 Executing SQL statements...\n');
  
  for (const { sql, desc } of queries) {
    console.log(`   ${desc}...`);
    
    try {
      // Try using fetch directly since RPC might not exist
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (response.ok || response.status === 404) {
        // 404 means RPC doesn't exist, but we'll try alternative
        if (response.status === 404) {
          console.log(`   ⚠️  RPC not available, SQL needs manual execution`);
        } else {
          console.log(`   ✅ Success`);
        }
      } else {
        const text = await response.text();
        console.log(`   ⚠️  Error: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
  }

  // Verify by checking table structure
  console.log('\n🔍 Verifying changes...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Verification error:', error.message);
    console.log('\n⚠️  The SQL statements above need to be executed manually in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy and paste the SQL from: supabase/migrations/20260205120800_add_profiles_fields.sql');
    console.log('   5. Click "Run"');
  } else {
    console.log('✅ Profiles table accessible');
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Current columns:', columns.join(', '));
      
      // Check if new columns exist
      const requiredColumns = ['cpf', 'phone', 'funcao', 'active', 'hire_date'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
        console.log('\n📝 Please execute the SQL manually in Supabase Dashboard SQL Editor:');
        console.log('   File: supabase/migrations/20260205120800_add_profiles_fields.sql');
      } else {
        console.log('\n✅ All required columns exist!');
      }
    }
  }

  console.log('\n✨ Script complete!');
}

addFields().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
