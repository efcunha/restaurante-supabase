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

async function fixComanda4() {
  console.log('🔧 Corrigindo Comanda 4...\n');

  const comandaNumber = '4';
  const dateKey = '2026-02-05';

  // Buscar comanda
  const { data: comanda, error: findError } = await supabase
    .from('comandas')
    .select('*')
    .eq('comanda_number', comandaNumber)
    .eq('date_key', dateKey)
    .single();

  if (findError || !comanda) {
    console.error('❌ Comanda não encontrada:', findError);
    return;
  }

  console.log('Comanda 4 atual:');
  console.log(`  Total Consumed: R$ ${Number(comanda.total_consumed).toFixed(2)}`);
  console.log(`  Total Paid: R$ ${Number(comanda.total_paid).toFixed(2)}`);
  console.log(`  Open Balance: R$ ${Number(comanda.open_balance).toFixed(2)}`);

  // Buscar pagamentos reais
  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('amount')
    .eq('comanda_number', comandaNumber)
    .eq('date_key', dateKey);

  const totalPagamentosReal = pagamentos?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  console.log(`\nTotal de pagamentos registrados: R$ ${totalPagamentosReal.toFixed(2)}`);
  console.log(`\n🔧 Corrigindo para:`);
  console.log(`  Total Paid: R$ ${totalPagamentosReal.toFixed(2)}`);
  console.log(`  Open Balance: R$ ${Math.max(0, Number(comanda.total_consumed) - totalPagamentosReal).toFixed(2)}`);

  // Atualizar comanda
  const { error: updateError } = await supabase
    .from('comandas')
    .update({
      total_paid: totalPagamentosReal,
      open_balance: Math.max(0, Number(comanda.total_consumed) - totalPagamentosReal),
      status: totalPagamentosReal >= Number(comanda.total_consumed) ? 'fechada' : 'aberta',
      updated_at: new Date().toISOString()
    })
    .eq('comanda_number', comandaNumber)
    .eq('date_key', dateKey);

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError);
  } else {
    console.log('\n✅ Comanda 4 corrigida!');
  }
}

fixComanda4().catch(console.error);
