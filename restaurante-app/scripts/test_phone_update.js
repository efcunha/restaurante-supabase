#!/usr/bin/env node
/**
 * Test phone update
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

console.log('🧪 Testando atualização de telefone...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPhoneUpdate() {
  try {
    // Buscar o Edson
    const { data: edson, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'edsonfcunha68@gmail.com')
      .single();

    if (fetchError) throw fetchError;

    console.log('📋 Dados atuais do Edson:');
    console.log('   Nome:', edson.full_name);
    console.log('   CPF:', edson.cpf);
    console.log('   Phone:', edson.phone || 'VAZIO');
    console.log('   Email:', edson.email);
    console.log('');

    // Atualizar com telefone
    console.log('🔄 Atualizando telefone para: (83) 99917-2452');
    const { data: result, error: updateError } = await supabase
      .from('profiles')
      .update({
        phone: '(83) 99917-2452',
        updated_at: new Date().toISOString()
      })
      .eq('id', edson.id)
      .select();

    if (updateError) throw updateError;

    console.log('✅ Atualizado!');
    console.log('   Phone:', result[0].phone);
    console.log('');

    // Verificar
    const { data: verify } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', edson.id)
      .single();

    console.log('🔍 Verificação:');
    console.log('   Phone no banco:', verify.phone);
    console.log('');

    if (verify.phone === '(83) 99917-2452') {
      console.log('✅ Telefone salvo corretamente!');
    } else {
      console.log('❌ Telefone NÃO foi salvo!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testPhoneUpdate();
