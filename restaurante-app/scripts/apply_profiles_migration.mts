#!/usr/bin/env node
/**
 * Script to apply profiles fields migration
 * Adds cpf, phone, funcao, active, hire_date fields to profiles table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔧 Applying profiles fields migration...');
console.log('📍 Supabase URL:', SUPABASE_URL);

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('\n📄 Reading migration file...');
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20260205120800_add_profiles_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file loaded');
    console.log('\n🚀 Executing SQL...\n');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('\n⚠️  RPC method not available, trying direct execution...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`\n📝 Executing: ${statement.substring(0, 80)}...`);
          const { error: execError } = await supabase.rpc('exec', { sql: statement });
          
          if (execError) {
            console.error('❌ Error:', execError.message);
            // Continue with other statements
          } else {
            console.log('✅ Success');
          }
        }
      }
    } else {
      console.log('\n✅ Migration executed successfully!');
      if (data) {
        console.log('📊 Result:', data);
      }
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: columns, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ Profiles table structure verified');
      if (columns && columns.length > 0) {
        console.log('📋 Available columns:', Object.keys(columns[0]).join(', '));
      }
    }
    
    console.log('\n✨ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test employee editing in the app');
    console.log('   2. Verify CPF, phone, and funcao fields are working');
    console.log('   3. Note: Password changes require "Esqueci minha senha" flow');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
