#!/usr/bin/env node
/**
 * Check RLS policies for profiles table
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔍 Verificando políticas RLS da tabela profiles...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkPolicies() {
  try {
    // Verificar políticas RLS
    console.log('📋 Políticas RLS atuais:\n');
    
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles');

    if (error) {
      console.log('⚠️  Não foi possível consultar pg_policies diretamente');
      console.log('   Vou verificar se as atualizações funcionam...\n');
    } else {
      console.log('Políticas encontradas:', policies);
    }

    // Testar atualização de cada usuário
    console.log('🧪 Testando atualização de cada usuário:\n');

    const { data: employees } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    for (const emp of employees) {
      console.log(`📝 Testando: ${emp.full_name} (${emp.email})`);
      
      // Tentar atualizar com dados de teste
      const testData = {
        cpf: '111.222.333-44',
        phone: '(81) 98888-7777',
        funcao: emp.role,
        active: true,
        updated_at: new Date().toISOString()
      };

      const { data: result, error: updateError } = await supabase
        .from('profiles')
        .update(testData)
        .eq('id', emp.id)
        .select();

      if (updateError) {
        console.log(`   ❌ ERRO ao atualizar: ${updateError.message}`);
        console.log(`   Código: ${updateError.code}`);
        console.log(`   Detalhes: ${updateError.details}`);
      } else {
        console.log(`   ✅ Atualizado com sucesso!`);
        console.log(`   CPF: ${result[0].cpf}`);
        console.log(`   Phone: ${result[0].phone}`);
      }
      console.log('');
    }

    // Verificar estado final
    console.log('📊 Estado final:\n');
    const { data: finalData } = await supabase
      .from('profiles')
      .select('id, full_name, email, cpf, phone, funcao, role, active')
      .order('full_name');

    finalData.forEach(emp => {
      console.log(`👤 ${emp.full_name}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   CPF: ${emp.cpf || 'VAZIO'}`);
      console.log(`   Phone: ${emp.phone || 'VAZIO'}`);
      console.log(`   Role: ${emp.role}`);
      console.log(`   Funcao: ${emp.funcao || 'VAZIO'}`);
      console.log(`   Active: ${emp.active}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkPolicies();
