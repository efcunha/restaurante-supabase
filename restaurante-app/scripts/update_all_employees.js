#!/usr/bin/env node
/**
 * Script to update ALL employees with default values for new fields
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🔧 Atualizando TODOS os funcionários...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateAllEmployees() {
  try {
    // 1. Listar todos os funcionários
    console.log('📋 Buscando todos os funcionários...');
    const { data: employees, error: listError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (listError) throw listError;

    console.log(`✅ Encontrados ${employees.length} funcionários\n`);

    // 2. Atualizar cada funcionário
    for (const emp of employees) {
      console.log(`📝 Atualizando: ${emp.full_name} (${emp.email})`);
      console.log(`   Antes: CPF=${emp.cpf || 'NULL'}, Phone=${emp.phone || 'NULL'}, Funcao=${emp.funcao || 'NULL'}, Active=${emp.active}`);

      const updateData = {
        // Se já tem valor, mantém. Se não tem, coloca valor padrão
        cpf: emp.cpf || '',
        phone: emp.phone || '',
        funcao: emp.funcao || emp.role, // Sincroniza funcao com role
        active: emp.active !== false ? true : emp.active, // Garante que active seja boolean
        updated_at: new Date().toISOString()
      };

      const { data: result, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', emp.id)
        .select();

      if (updateError) {
        console.log(`   ❌ Erro: ${updateError.message}`);
        continue;
      }

      console.log(`   ✅ Atualizado: CPF=${result[0].cpf || 'vazio'}, Phone=${result[0].phone || 'vazio'}, Funcao=${result[0].funcao}, Active=${result[0].active}\n`);
    }

    // 3. Verificar resultado final
    console.log('🔍 Verificando resultado final...\n');
    const { data: finalData, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (finalError) throw finalError;

    console.log('📊 Estado final de todos os funcionários:');
    finalData.forEach(emp => {
      console.log(`\n   👤 ${emp.full_name} (${emp.email})`);
      console.log(`      Role: ${emp.role}`);
      console.log(`      CPF: ${emp.cpf || 'não preenchido'}`);
      console.log(`      Phone: ${emp.phone || 'não preenchido'}`);
      console.log(`      Funcao: ${emp.funcao || 'não preenchido'}`);
      console.log(`      Active: ${emp.active}`);
      console.log(`      Hire Date: ${emp.hire_date || 'não preenchido'}`);
    });

    console.log('\n✨ Atualização completa!');
    console.log('\n📝 Agora você pode:');
    console.log('   1. Editar qualquer funcionário no app');
    console.log('   2. Alterar CPF, telefone e função');
    console.log('   3. Para senha: usar botão "Enviar Email de Redefinição"');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

updateAllEmployees();
