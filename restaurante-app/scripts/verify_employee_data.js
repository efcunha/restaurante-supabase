#!/usr/bin/env node
/**
 * Verify employee data in database
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔍 Verificando dados dos funcionários no banco...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyData() {
  try {
    const { data: employees, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) throw error;

    console.log(`📊 Total de funcionários: ${employees.length}\n`);

    employees.forEach((emp, index) => {
      console.log(`${index + 1}. 👤 ${emp.full_name || 'SEM NOME'}`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Email: ${emp.email || 'N/A'}`);
      console.log(`   CPF: ${emp.cpf || 'N/A'}`);
      console.log(`   Phone: ${emp.phone || 'N/A'}`);
      console.log(`   Role: ${emp.role || 'N/A'}`);
      console.log(`   Funcao: ${emp.funcao || 'N/A'}`);
      console.log(`   Active: ${emp.active}`);
      console.log(`   Company ID: ${emp.company_id || 'N/A'}`);
      console.log(`   Created: ${emp.created_at}`);
      console.log(`   Updated: ${emp.updated_at}`);
      console.log('');
    });

    // Verificar especificamente o edsonfcunha68
    const edson = employees.find(e => e.email === 'edsonfcunha68@gmail.com');
    if (edson) {
      console.log('🔍 Detalhes do edsonfcunha68:');
      console.log(JSON.stringify(edson, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verifyData();
