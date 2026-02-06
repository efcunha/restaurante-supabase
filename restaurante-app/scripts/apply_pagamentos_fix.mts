import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Corrigindo constraint da tabela pagamentos...\n');

  // Try to drop the constraint
  const { error: dropError } = await supabase.rpc('exec', {
    query: 'ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_payment_method_check;'
  });

  if (dropError) {
    console.log('⚠️ Não foi possível executar via RPC.');
    console.log('\n📝 Execute este SQL manualmente no Supabase Dashboard > SQL Editor:\n');
    const sql = readFileSync(join(__dirname, 'fix_pagamentos_constraint.sql'), 'utf-8');
    console.log(sql);
    console.log('\n🔗 URL: https://supabase.com/dashboard/project/ykalocfhnetxenvmtlcn/sql/new');
    return;
  }

  console.log('✅ Constraint removido com sucesso!');
}

applyFix().catch(console.error);
