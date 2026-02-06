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

async function fixPayment() {
  console.log('🔧 Corrigindo pagamento da Comanda 6 para R$ 112...\n');

  // 1. Atualizar o pagamento existente de R$ 40 para R$ 112
  const { data: pagamento, error: findError } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('comanda_number', '6')
    .single();

  if (findError) {
    console.error('❌ Erro ao buscar pagamento:', findError);
    return;
  }

  console.log(`💰 Pagamento atual: R$ ${pagamento.amount}`);

  const { error: updatePaymentError } = await supabase
    .from('pagamentos')
    .update({ amount: 112 })
    .eq('id', pagamento.id);

  if (updatePaymentError) {
    console.error('❌ Erro ao atualizar pagamento:', updatePaymentError);
    return;
  }

  console.log('✅ Pagamento atualizado para R$ 112');

  // 2. Atualizar comanda
  const { error: updateComandaError } = await supabase
    .from('comandas')
    .update({
      total_paid: 112,
      open_balance: 0,
      status: 'fechada',
      updated_at: new Date().toISOString()
    })
    .eq('comanda_number', 6)
    .eq('date_key', '2026-02-05');

  if (updateComandaError) {
    console.error('❌ Erro ao atualizar comanda:', updateComandaError);
    return;
  }

  console.log('✅ Comanda atualizada: Total Pago R$ 112, Saldo R$ 0');

  // 3. Marcar pedido como pago
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({
      is_paid: true,
      payment_method: 'dinheiro'
    })
    .eq('comanda_number', 6);

  if (updateOrderError) {
    console.error('❌ Erro ao atualizar pedido:', updateOrderError);
    return;
  }

  console.log('✅ Pedido marcado como pago');
  console.log('\n✅ Comanda 6 totalmente corrigida!');
}

fixPayment().catch(console.error);
