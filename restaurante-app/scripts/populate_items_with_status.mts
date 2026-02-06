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

// Helper to determine category from item name
// Categories must match OrderService.isKitchenCategory() expectations
function getCategoryFromName(itemName: string): string {
  const cleanName = itemName.toLowerCase().replace(/^\d+x?\s*/, '').trim();
  
  // Bebidas - NOT kitchen items
  if (cleanName.includes('chopp') || cleanName.includes('refrigerante') || cleanName.includes('água') || 
      cleanName.includes('suco') || cleanName.includes('cerveja') || cleanName.includes('agua')) {
    return 'bebida';
  }
  
  // Kitchen items
  if (cleanName.includes('caldo') || cleanName.includes('caldinho')) return 'caldo';
  if (cleanName.includes('risoto')) return 'comida'; // risoto é comida de cozinha
  if (cleanName.includes('pizza')) return 'pizza';
  
  // Espetinhos especiais
  if (cleanName.includes('picanha') || cleanName.includes('cupim') || cleanName.includes('carneiro')) {
    return 'espetinho-especial';
  }
  
  // Espetinhos simples
  if (cleanName.includes('espetinho') || cleanName.includes('carne') || cleanName.includes('frango') || 
      cleanName.includes('calabresa') || cleanName.includes('coração') || cleanName.includes('medalhão') ||
      cleanName.includes('bacon') || cleanName.includes('salsichão') || cleanName.includes('pão de alho') ||
      cleanName.includes('asinha')) {
    return 'espetinho-simples';
  }
  
  // Acompanhamentos e porções
  if (cleanName.includes('batata') || cleanName.includes('arroz') || cleanName.includes('macaxeira') ||
      cleanName.includes('farofa') || cleanName.includes('vinagrete')) {
    return 'porcao';
  }
  
  // Default para itens de cozinha genéricos
  return 'outro';
}

async function populateItemsWithStatus() {
  console.log('🔄 Populando items_with_status dos pedidos existentes...\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('date_key', '2026-02-05');

  if (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    return;
  }

  console.log(`📋 Pedidos a atualizar: ${orders?.length || 0}\n`);

  for (const order of orders || []) {
    // FORCE UPDATE: Recategorize all items with correct categories
    // if (order.items_with_status && order.items_with_status.length > 0) {
    //   console.log(`⏭️ Pedido ${order.id.substring(0, 8)}... já tem items_with_status, pulando`);
    //   continue;
    // }
    
    if (!order.items || order.items.length === 0) {
      console.log(`⏭️ Pedido ${order.id.substring(0, 8)}... sem itens, pulando`);
      continue;
    }

    const itemsWithStatus = order.items.map((itemName: string, index: number) => {
      const category = getCategoryFromName(itemName);
      
      return {
        id: `${order.id}-comanda-${order.comanda_number || 'temp'}-item-${index}`,
        name: itemName,
        status: 'preparing',
        checked: false,
        timestamp: order.created_at,
        category: category
      };
    });

    const { error: updateError } = await supabase
      .from('orders')
      .update({ items_with_status: itemsWithStatus })
      .eq('id', order.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar pedido ${order.id.substring(0, 8)}...:`, updateError.message);
    } else {
      console.log(`✅ Pedido ${order.id.substring(0, 8)}... atualizado (${itemsWithStatus.length} itens)`);
    }
  }

  console.log('\n✅ Processo concluído!');
}

populateItemsWithStatus().catch(console.error);
