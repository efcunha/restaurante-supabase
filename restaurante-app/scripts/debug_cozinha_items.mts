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

async function debugCozinhaItems() {
  console.log('🔍 Verificando itens que deveriam aparecer na cozinha...\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('date_key', '2026-02-05')
    .eq('status', 'preparing');

  if (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    return;
  }

  console.log(`📋 Pedidos em preparing: ${orders?.length || 0}\n`);

  for (const order of orders || []) {
    console.log(`\n📦 Pedido ${order.id.substring(0, 8)}... (Comanda #${order.comanda_number})`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Comanda Status: ${order.comanda_status || 'N/A'}`);
    console.log(`   Items with status:`, order.items_with_status?.length || 0);
    
    if (order.items_with_status && order.items_with_status.length > 0) {
      order.items_with_status.forEach((item: any, idx: number) => {
        console.log(`   ${idx + 1}. ${item.name}`);
        console.log(`      - Category: ${item.category}`);
        console.log(`      - Status: ${item.status}`);
        console.log(`      - Checked: ${item.checked}`);
      });
    } else {
      console.log('   ⚠️ SEM items_with_status!');
    }
  }
}

debugCozinhaItems().catch(console.error);
