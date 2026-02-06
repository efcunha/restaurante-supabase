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

async function checkAllPaidComandas() {
  console.log('🔍 Verificando todas as comandas pagas...\n');

  // Buscar todas as comandas com status 'fechada'
  const { data: comandas, error } = await supabase
    .from('comandas')
    .select('comanda_number, total_consumed, total_paid, open_balance, date_key')
    .eq('status', 'fechada')
    .order('comanda_number', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar comandas:', error);
    return;
  }

  console.log(`📋 Total de comandas pagas: ${comandas?.length || 0}\n`);

  const problemas: any[] = [];

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
      problemas.push({
        comanda: comanda.comanda_number,
        totalConsumed,
        totalPaidDB,
        totalPagamentosReal,
        diferenca,
        openBalanceDB: Number(comanda.open_balance),
        saldoEsperado
      });
    }
  }

  if (problemas.length === 0) {
    console.log('✅ Todas as comandas pagas estão corretas!');
  } else {
    console.log(`⚠️ Encontradas ${problemas.length} comandas com problemas:\n`);
    problemas.forEach(p => {
      console.log(`Comanda ${p.comanda}:`);
      console.log(`  Total Consumido: R$ ${p.totalConsumed.toFixed(2)}`);
      console.log(`  Total Pago (DB): R$ ${p.totalPaidDB.toFixed(2)}`);
      console.log(`  Total Pagamentos: R$ ${p.totalPagamentosReal.toFixed(2)}`);
      console.log(`  Diferença: R$ ${p.diferenca.toFixed(2)}`);
      console.log(`  Saldo (DB): R$ ${p.openBalanceDB.toFixed(2)}`);
      console.log(`  Saldo Esperado: R$ ${p.saldoEsperado.toFixed(2)}`);
      console.log('');
    });
  }
}

checkAllPaidComandas().catch(console.error);
