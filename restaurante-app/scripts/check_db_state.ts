
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
  console.log('Checking tables in public schema...');
  
  // We can't query information_schema directly with supabase-js easily unless we use rpc or raw sql if allowed
  // But we can try to select from the tables and check for error "relation does not exist"
  
  const tables = ['companies', 'profiles', 'orders', 'products', 'daily_statistics', 'audit_logs'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    
    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.log(`❌ Table '${table}' DOES NOT EXIST.`);
        } else {
            console.log(`⚠️ Table '${table}' exists but error: ${error.message}`);
        }
    } else {
        console.log(`✅ Table '${table}' EXISTS.`);
    }
  }
}

checkTables();
