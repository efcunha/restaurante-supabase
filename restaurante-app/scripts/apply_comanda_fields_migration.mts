import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Aplicando migration para adicionar campos de pagamento...\n');

  // Read the SQL file
  const sqlPath = join(__dirname, '..', '..', 'supabase', 'migrations', '20260205120600_add_comanda_payment_fields.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Erro ao executar SQL:', error);
    console.log('\n⚠️ Você precisa executar o SQL manualmente no Supabase Dashboard:');
    console.log('URL: https://supabase.com/dashboard/project/ykalocfhnetxenvmtlcn/sql/new');
    console.log('\nSQL:\n');
    console.log(sql);
    return;
  }

  console.log('✅ Migration aplicada com sucesso!');

  // Now update existing comandas with data from orders
  console.log('\n🔄 Atualizando comandas existentes com dados dos pedidos...\n');

  const { data: comandas, error: comandasError } = await supabase
    .from('comandas')
    .select('*');

  if (comandasError) {
    console.error('❌ Erro ao buscar comandas:', comandasError);
    return;
  }

  for (const comanda of comandas || []) {
    // Get orders for this comanda
    const { data: orders } = await supabase
      .from('orders')
      .select('client_name, table_number, mesa')
      .eq('comanda_number', String(comanda.comanda_number))
      .eq('date_key', comanda.date_key)
      .limit(1);

    if (orders && orders.length > 0) {
      const order = orders[0];
      const updateData: any = {};

      // Update cliente if not set
      if (!comanda.cliente && (order.client_name || comanda.client_name)) {
        updateData.cliente = order.client_name || comanda.client_name;
      }

      // Update mesa if not set
      if (!comanda.mesa && (order.table_number || order.mesa || comanda.table_number)) {
        updateData.mesa = String(order.table_number || order.mesa || comanda.table_number || '');
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
          console.error(`❌ Erro ao atualizar comanda ${comanda.comanda_number}:`, updateError);
        } else {
          console.log(`✅ Comanda ${comanda.comanda_number} atualizada`);
        }
      }
    }
  }

  console.log('\n✅ Atualização concluída!');
}

applyMigration().catch(console.error);
