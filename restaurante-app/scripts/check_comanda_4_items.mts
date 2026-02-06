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

async function checkComanda4() {
  console.log('🔍 Verificando itens da comanda 4...\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('date_key', '2026-02-05')
    .eq('comanda_number', '4');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📋 Pedidos da comanda 4: ${orders?.length || 0}\n`);

  for (const order of orders || []) {
    console.log(`\n📦 Pedido ${order.id.substring(0, 8)}...`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Items with status:`);
    
    if (order.items_with_status && order.items_with_status.length > 0) {
      order.items_with_status.forEach((item: any, idx: number) => {
        console.log(`   ${idx + 1}. ${item.name}`);
        console.log(`      - ID: ${item.id}`);
        console.log(`      - Category: ${item.category}`);
        console.log(`      - Status: ${item.status}`);
        console.log(`      - Checked: ${item.checked}`);
      });
    }
  }
}

checkComanda4().catch(console.error);
