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

async function fixAllPaidComandas() {
  console.log('🔧 Corrigindo todas as comandas pagas...\n');

  // Buscar todas as comandas com status 'fechada'
  const { data: comandas, error } = await supabase
    .from('comandas')
    .select('id, comanda_number, total_consumed, total_paid, open_balance, date_key, company_id')
    .eq('status', 'fechada')
    .order('comanda_number', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar comandas:', error);
    return;
  }

  console.log(`📋 Verificando ${comandas?.length || 0} comandas...\n`);

  let corrigidas = 0;

  for (const comanda of comandas || []) {
    // Buscar pagamentos reais
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('amount')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key);

    const totalPagamentosReal = pagamentos?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalPaidDB = Number(comanda.total_paid);
    const totalConsumed = Number(comanda.total_consumed);

    const diferenca = Math.abs(totalPaidDB - totalPagamentosReal);
    const saldoEsperado = Math.max(0, totalConsumed - totalPagamentosReal);

    if (diferenca > 0.01 || Number(comanda.open_balance) !== saldoEsperado) {
      console.log(`🔧 Corrigindo Comanda ${comanda.comanda_number}:`);
      console.log(`   Total Pago: R$ ${totalPaidDB.toFixed(2)} → R$ ${totalPagamentosReal.toFixed(2)}`);
      console.log(`   Saldo: R$ ${Number(comanda.open_balance).toFixed(2)} → R$ ${saldoEsperado.toFixed(2)}`);

      const { error: updateError } = await supabase
        .from('comandas')
        .update({
          total_paid: totalPagamentosReal,
          open_balance: saldoEsperado,
          updated_at: new Date().toISOString()
        })
        .eq('id', comanda.id);

      if (updateError) {
        console.error(`   ❌ Erro ao atualizar: ${updateError.message}`);
      } else {
        console.log(`   ✅ Corrigida!`);
        corrigidas++;
      }
      console.log('');
    }
  }

  if (corrigidas === 0) {
    console.log('✅ Todas as comandas já estavam corretas!');
  } else {
    console.log(`✅ ${corrigidas} comanda(s) corrigida(s)!`);
  }
}

fixAllPaidComandas().catch(console.error);
