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

async function checkComandaDetails() {
  console.log('🔍 Verificando detalhes das comandas...\n');

  // Buscar todas as comandas
  const { data: comandas, error } = await supabase
    .from('comandas')
    .select('*')
    .order('comanda_number', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar comandas:', error);
    return;
  }

  console.log(`📋 Total de comandas: ${comandas?.length || 0}\n`);

  for (const comanda of comandas || []) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Comanda ${comanda.comanda_number} (${comanda.status})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Cliente: ${comanda.cliente || 'N/A'}`);
    console.log(`Mesa: ${comanda.mesa || 'N/A'}`);
    console.log(`Date Key: ${comanda.date_key}`);
    console.log(`\nTotais na tabela comandas:`);
    console.log(`  Total Consumed: R$ ${Number(comanda.total_consumed || 0).toFixed(2)}`);
    console.log(`  Total Paid: R$ ${Number(comanda.total_paid || 0).toFixed(2)}`);
    console.log(`  Open Balance: R$ ${Number(comanda.open_balance || 0).toFixed(2)}`);

    // Buscar pagamentos reais
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key);

    const totalPagamentosReal = pagamentos?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    console.log(`\nPagamentos registrados (${pagamentos?.length || 0}):`);
    if (pagamentos && pagamentos.length > 0) {
      pagamentos.forEach(p => {
        console.log(`  - R$ ${Number(p.amount).toFixed(2)} (${p.payment_method}) por ${p.received_by_name || 'N/A'}`);
      });
      console.log(`  Total Real: R$ ${totalPagamentosReal.toFixed(2)}`);
    } else {
      console.log(`  Nenhum pagamento registrado`);
    }

    // Buscar pedidos
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, is_paid, payment_method')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key);

    const totalOrders = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
    const paidOrders = orders?.filter(o => o.is_paid).length || 0;

    console.log(`\nPedidos (${orders?.length || 0}):`);
    console.log(`  Total dos pedidos: R$ ${totalOrders.toFixed(2)}`);
    console.log(`  Pedidos pagos: ${paidOrders}/${orders?.length || 0}`);

    const diferenca = Math.abs(Number(comanda.total_paid) - totalPagamentosReal);
    if (diferenca > 0.01) {
      console.log(`\n⚠️ INCONSISTÊNCIA DETECTADA!`);
      console.log(`  Diferença: R$ ${diferenca.toFixed(2)}`);
    } else {
      console.log(`\n✅ Valores consistentes`);
    }
  }
}

checkComandaDetails().catch(console.error);
