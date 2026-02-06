import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ TEST_SUPABASE_URL ou TEST_SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.test');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkComanda6() {
  console.log('🔍 Verificando Comanda 6...\n');

  // 1. Buscar comanda
  const { data: comanda, error: comandaError } = await supabase
    .from('comandas')
    .select('*')
    .eq('comanda_number', 6)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (comandaError) {
    console.error('❌ Erro ao buscar comanda:', comandaError);
    return;
  }

  console.log('📋 COMANDA:');
  console.log(`  Número: ${comanda.comanda_number}`);
  console.log(`  Status: ${comanda.status}`);
  console.log(`  Total Consumido: R$ ${comanda.total_consumed}`);
  console.log(`  Total Pago: R$ ${comanda.total_paid}`);
  console.log(`  Saldo Aberto: R$ ${comanda.open_balance}`);
  console.log(`  Date Key: ${comanda.date_key}\n`);

  // 2. Buscar pagamentos
  const { data: pagamentos, error: pagamentosError } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('comanda_number', '6')
    .order('created_at', { ascending: true });

  if (pagamentosError) {
    console.error('❌ Erro ao buscar pagamentos:', pagamentosError);
  } else {
    console.log(`💰 PAGAMENTOS (${pagamentos?.length || 0}):`);
    let totalPagamentos = 0;
    pagamentos?.forEach((p, i) => {
      console.log(`  ${i + 1}. R$ ${p.amount} - ${p.payment_method} - ${new Date(p.created_at).toLocaleString()}`);
      totalPagamentos += Number(p.amount);
    });
    console.log(`  TOTAL SOMADO: R$ ${totalPagamentos}\n`);
  }

  // 3. Buscar pedidos
  const { data: pedidos, error: pedidosError } = await supabase
    .from('orders')
    .select('*')
    .eq('comanda_number', 6)
    .order('created_at', { ascending: true });

  if (pedidosError) {
    console.error('❌ Erro ao buscar pedidos:', pedidosError);
  } else {
    console.log(`🍽️ PEDIDOS (${pedidos?.length || 0}):`);
    let totalPedidos = 0;
    pedidos?.forEach((p, i) => {
      console.log(`  ${i + 1}. R$ ${p.total_amount} - ${p.items?.length || 0} itens - Pago: ${p.is_paid ? 'SIM' : 'NÃO'}`);
      totalPedidos += Number(p.total_amount);
    });
    console.log(`  TOTAL SOMADO: R$ ${totalPedidos}\n`);
  }
}

checkComanda6().catch(console.error);
