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

async function fixComanda6() {
  console.log('🔧 Corrigindo Comanda 6...\n');

  // 1. Buscar todos os pagamentos
  const { data: pagamentos, error: pagamentosError } = await supabase
    .from('pagamentos')
    .select('amount')
    .eq('comanda_number', '6');

  if (pagamentosError) {
    console.error('❌ Erro ao buscar pagamentos:', pagamentosError);
    return;
  }

  const totalPagoReal = pagamentos?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  console.log(`💰 Total de pagamentos registrados: R$ ${totalPagoReal}`);

  // 2. Buscar comanda
  const { data: comanda, error: comandaError } = await supabase
    .from('comandas')
    .select('total_consumed, total_paid')
    .eq('comanda_number', 6)
    .eq('date_key', '2026-02-05')
    .single();

  if (comandaError) {
    console.error('❌ Erro ao buscar comanda:', comandaError);
    return;
  }

  console.log(`📋 Total Consumido: R$ ${comanda.total_consumed}`);
  console.log(`📋 Total Pago (ERRADO): R$ ${comanda.total_paid}`);

  const novoSaldo = Math.max(0, Number(comanda.total_consumed) - totalPagoReal);

  console.log(`\n✅ Valores corretos:`);
  console.log(`   Total Pago: R$ ${totalPagoReal}`);
  console.log(`   Saldo Aberto: R$ ${novoSaldo}`);

  // 3. Atualizar comanda
  const { error: updateError } = await supabase
    .from('comandas')
    .update({
      total_paid: totalPagoReal,
      open_balance: novoSaldo,
      updated_at: new Date().toISOString()
    })
    .eq('comanda_number', 6)
    .eq('date_key', '2026-02-05');

  if (updateError) {
    console.error('❌ Erro ao atualizar comanda:', updateError);
    return;
  }

  console.log('\n✅ Comanda 6 corrigida com sucesso!');
}

fixComanda6().catch(console.error);
