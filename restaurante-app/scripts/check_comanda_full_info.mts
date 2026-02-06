import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFullInfo() {
  console.log('🔍 Verificando informações completas das comandas...\n');

  const { data: comandas, error } = await supabase
    .from('comandas')
    .select('*')
    .eq('status', 'fechada')
    .order('comanda_number', { ascending: true });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📋 Comandas pagas: ${comandas?.length || 0}\n`);

  for (const comanda of comandas || []) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Comanda ${comanda.comanda_number}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    console.log(`\n📝 Informações Básicas:`);
    console.log(`  Cliente: ${comanda.cliente || 'N/A'}`);
    console.log(`  Mesa: ${comanda.mesa || 'N/A'}`);
    console.log(`  Status: ${comanda.status}`);
    
    const createdDate = comanda.created_at ? new Date(comanda.created_at) : null;
    const hora = createdDate ? createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    console.log(`  Hora: ${hora}`);
    
    console.log(`\n👤 Garçom:`);
    console.log(`  Nome: ${comanda.opened_by_name || 'N/A'}`);
    
    console.log(`\n💰 Totais:`);
    console.log(`  Total Consumido: R$ ${Number(comanda.total_consumed || 0).toFixed(2)}`);
    console.log(`  Total Pago: R$ ${Number(comanda.total_paid || 0).toFixed(2)}`);
    console.log(`  Saldo: R$ ${Number(comanda.open_balance || 0).toFixed(2)}`);
    
    console.log(`\n💳 Informações de Pagamento:`);
    console.log(`  Recebido por: ${comanda.ultimo_pagamento_por || 'N/A'}`);
    console.log(`  Forma: ${comanda.ultimo_pagamento_forma || 'N/A'}`);
    
    if (comanda.pagamentos_resumo) {
      console.log(`  Resumo:`);
      Object.entries(comanda.pagamentos_resumo).forEach(([forma, valor]) => {
        console.log(`    ${forma.toUpperCase()}: R$ ${Number(valor).toFixed(2)}`);
      });
    }
    
    console.log('');
  }
}

checkFullInfo().catch(console.error);
