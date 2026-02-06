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

async function updateComandas() {
  console.log('🔄 Atualizando comandas existentes com dados completos...\n');

  // Get all comandas
  const { data: comandas, error: comandasError } = await supabase
    .from('comandas')
    .select('*');

  if (comandasError) {
    console.error('❌ Erro ao buscar comandas:', comandasError);
    return;
  }

  console.log(`📋 Encontradas ${comandas?.length || 0} comandas\n`);

  for (const comanda of comandas || []) {
    const updateData: any = {};

    console.log(`\n🔧 Processando Comanda ${comanda.comanda_number}...`);

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
      const clienteValue = order.client_name || order.client || comanda.client_name || 'Não informado';
      if (!comanda.cliente || comanda.cliente !== clienteValue) {
        updateData.cliente = clienteValue;
        console.log(`  Cliente: ${clienteValue}`);
      }

      // Set mesa
      const mesaValue = order.table_number || order.mesa || comanda.table_number;
      if (mesaValue && (!comanda.mesa || comanda.mesa !== String(mesaValue))) {
        updateData.mesa = String(mesaValue);
        console.log(`  Mesa: ${mesaValue}`);
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
      console.log(`  Pagamentos: ${JSON.stringify(resumo)}`);

      // Get last payment info
      const lastPayment = pagamentos[0];
      updateData.ultimo_pagamento_por = lastPayment.received_by_name;
      updateData.ultimo_pagamento_forma = lastPayment.payment_method;
      updateData.ultimo_pagamento_em = lastPayment.created_at;
      console.log(`  Último pagamento: ${lastPayment.payment_method} por ${lastPayment.received_by_name}`);
    }

    // Update if we have data
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('comandas')
        .update(updateData)
        .eq('id', comanda.id);

      if (updateError) {
        console.error(`  ❌ Erro: ${updateError.message}`);
      } else {
        console.log(`  ✅ Atualizada com sucesso`);
      }
    } else {
      console.log(`  ℹ️ Nenhuma atualização necessária`);
    }
  }

  console.log('\n✅ Processo concluído!');
}

updateComandas().catch(console.error);
