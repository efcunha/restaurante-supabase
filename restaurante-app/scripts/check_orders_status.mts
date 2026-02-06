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

async function checkOrders() {
  console.log('🔍 Verificando pedidos...\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('date_key', '2026-02-05')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📋 Total de pedidos: ${orders?.length || 0}\n`);

  for (const order of orders || []) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Pedido ${order.id.substring(0, 8)}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Comanda: ${order.comanda_number || 'N/A'}`);
    console.log(`Cliente: ${order.client_name || 'N/A'}`);
    console.log(`Status: ${order.status}`);
    console.log(`Criado em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
    console.log(`\nItens (${order.items?.length || 0}):`);
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: string, i: number) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    }
    console.log(`\nItems With Status (${order.items_with_status?.length || 0}):`);
    if (order.items_with_status && order.items_with_status.length > 0) {
      order.items_with_status.forEach((item: any, i: number) => {
        console.log(`  ${i + 1}. ${item.name} - Status: ${item.status} - Checked: ${item.checked} - Category: ${item.category || 'N/A'}`);
      });
    } else {
      console.log(`  ⚠️ Nenhum item com status!`);
    }
    console.log('');
  }
}

checkOrders().catch(console.error);
