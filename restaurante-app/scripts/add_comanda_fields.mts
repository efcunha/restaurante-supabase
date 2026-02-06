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

async function addFields() {
  console.log('🔧 Adicionando campos à tabela comandas...\n');

  const queries = [
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS pagamentos_resumo jsonb DEFAULT '{}'::jsonb",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS ultimo_pagamento_por text",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS ultimo_pagamento_forma text",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS ultimo_pagamento_em timestamptz",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS mesa text",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS cliente text",
    "ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS motivo_cancelamento text"
  ];

  for (const query of queries) {
    const { error } = await supabase.rpc('exec_sql', { sql: query });
    if (error) {
      console.log(`⚠️ Query: ${query}`);
      console.log(`   Erro: ${error.message}\n`);
    } else {
      console.log(`✅ ${query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1] || 'Query executada'}`);
    }
  }

  console.log('\n🔄 Atualizando comandas existentes...\n');

  // Get all comandas
  const { data: comandas, error: comandasError } = await supabase
    .from('comandas')
    .select('*');

  if (comandasError) {
    console.error('❌ Erro ao buscar comandas:', comandasError);
    return;
  }

  for (const comanda of comandas || []) {
    const updateData: any = {};

    // Get first order for this comanda to get client and table info
    const { data: orders } = await supabase
      .from('orders')
      .select('client_name, client, table_number, mesa')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key)
      .limit(1);

    if (orders && orders.length > 0) {
      const order = orders[0];
      
      // Set cliente
      if (!comanda.cliente) {
        updateData.cliente = order.client_name || order.client || comanda.client_name || 'Não informado';
      }

      // Set mesa
      if (!comanda.mesa) {
        const mesaValue = order.table_number || order.mesa || comanda.table_number;
        if (mesaValue) {
          updateData.mesa = String(mesaValue);
        }
      }
    }

    // Get payments for this comanda
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key)
      .order('created_at', { ascending: false });

    if (pagamentos && pagamentos.length > 0) {
      // Build pagamentos_resumo
      const resumo: any = {};
      pagamentos.forEach(p => {
        const method = p.payment_method;
        resumo[method] = (resumo[method] || 0) + Number(p.amount);
      });

      updateData.pagamentos_resumo = resumo;

      // Get last payment info
      const lastPayment = pagamentos[0];
      updateData.ultimo_pagamento_por = lastPayment.received_by_name;
      updateData.ultimo_pagamento_forma = lastPayment.payment_method;
      updateData.ultimo_pagamento_em = lastPayment.created_at;
    }

    // Update if we have data
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('comandas')
        .update(updateData)
        .eq('id', comanda.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar comanda ${comanda.comanda_number}:`, updateError.message);
      } else {
        console.log(`✅ Comanda ${comanda.comanda_number} atualizada`);
      }
    }
  }

  console.log('\n✅ Processo concluído!');
}

addFields().catch(console.error);
