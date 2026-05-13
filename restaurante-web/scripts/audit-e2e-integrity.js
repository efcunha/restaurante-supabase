const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(2);
}

const hours = Number(process.env.E2E_AUDIT_WINDOW_HOURS || 6);
const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const dateKey = new Date().toISOString().slice(0, 10);

const users = [
  { label: 'garcom01', email: process.env.PLAYWRIGHT_TEST_EMAIL, password: process.env.PLAYWRIGHT_TEST_PASSWORD },
  { label: 'garcom02', email: process.env.PLAYWRIGHT_TEST_EMAIL_GARCOM02, password: process.env.PLAYWRIGHT_TEST_PASSWORD_GARCOM02 },
].filter((u) => u.email && u.password);

function sumTotal(list) {
  return (list || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
}

async function auditUser(user) {
  const supabase = createClient(url, anon);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (authError) {
    return {
      label: user.label,
      fatal: [`Auth failed: ${authError.message}`],
      warnings: [],
      infos: [],
      inconsistencies: [],
    };
  }

  const userId = authData.user?.id;
  const result = {
    label: user.label,
    fatal: [],
    warnings: [],
    infos: [`userId=${userId}`],
    inconsistencies: [],
  };

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id,created_at,client_name,table_number,comanda_number,status,order_type,total_amount')
    .eq('created_by', userId)
    .eq('date_key', dateKey)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: true });

  if (ordersError) {
    result.fatal.push(`Orders query failed: ${ordersError.message}`);
    await supabase.auth.signOut();
    return result;
  }

  result.infos.push(`ordersInWindow=${orders.length}`);

  const ordersByComanda = new Map();
  for (const order of orders) {
    if (!order.comanda_number) continue;
    const key = String(order.comanda_number);
    if (!ordersByComanda.has(key)) ordersByComanda.set(key, []);
    ordersByComanda.get(key).push(order);
  }

  if (ordersByComanda.size === 0) {
    result.warnings.push('No orders with comanda_number in audit window');
    await supabase.auth.signOut();
    return result;
  }

  const comandaNumbers = [...ordersByComanda.keys()].map((n) => Number(n)).filter((n) => Number.isFinite(n));

  const { data: comandas, error: comandasError } = await supabase
    .from('comandas')
    .select('id,comanda_number,status,total_consumed,total_paid,open_balance,merged_into_comanda_number,created_at')
    .eq('date_key', dateKey)
    .in('comanda_number', comandaNumbers)
    .order('created_at', { ascending: true });

  if (comandasError) {
    result.fatal.push(`Comandas query failed: ${comandasError.message}`);
    await supabase.auth.signOut();
    return result;
  }

  const groupedComandas = new Map();
  for (const c of comandas) {
    const key = String(c.comanda_number);
    if (!groupedComandas.has(key)) groupedComandas.set(key, []);
    groupedComandas.get(key).push(c);
  }

  for (const [comanda, comandaOrders] of ordersByComanda.entries()) {
    const activeOrders = comandaOrders.filter((o) => !['cancelled', 'cancelada'].includes(String(o.status || '').toLowerCase()));
    const expectedConsumed = Number(sumTotal(activeOrders).toFixed(2));
    const rows = groupedComandas.get(comanda) || [];

    if (rows.length === 0) {
      result.inconsistencies.push(`Comanda ${comanda}: sem linha em comandas para ${activeOrders.length} pedidos ativos`);
      continue;
    }

    const openRow = rows.find((r) => r.status === 'aberta') || rows[rows.length - 1];
    const dbConsumed = Number(Number(openRow.total_consumed || 0).toFixed(2));

    if (Math.abs(dbConsumed - expectedConsumed) > 0.01) {
      result.inconsistencies.push(
        `Comanda ${comanda}: total_consumed=${dbConsumed} divergente de somaPedidos=${expectedConsumed} (status=${openRow.status})`
      );
    }

    const typeSet = new Set(comandaOrders.map((o) => String(o.order_type || 'local')));
    if (typeSet.has('local') && typeSet.has('delivery')) {
      result.warnings.push(`Comanda ${comanda}: mistura order_type local+delivery na mesma comanda`);
    }

    if (rows.some((r) => r.status === 'merged') && rows.some((r) => r.status === 'aberta')) {
      const mergedRows = rows.filter((r) => r.status === 'merged');
      for (const merged of mergedRows) {
        if (!merged.merged_into_comanda_number) {
          result.warnings.push(`Comanda ${comanda}: linha merged sem merged_into_comanda_number`);
        }
      }
    }
  }

  await supabase.auth.signOut();
  return result;
}

(async () => {
  if (users.length === 0) {
    console.error('No Playwright users configured in .env (PLAYWRIGHT_TEST_EMAIL*).');
    process.exit(2);
  }

  const all = [];
  for (const user of users) {
    all.push(await auditUser(user));
  }

  console.log(`E2E integrity audit window=${hours}h dateKey=${dateKey}`);

  let hasFatal = false;
  let hasInconsistency = false;

  for (const r of all) {
    console.log(`\n[${r.label}]`);
    for (const info of r.infos) console.log(`  INFO: ${info}`);
    for (const warn of r.warnings) console.log(`  WARN: ${warn}`);
    for (const err of r.fatal) {
      hasFatal = true;
      console.log(`  FATAL: ${err}`);
    }
    for (const inc of r.inconsistencies) {
      hasInconsistency = true;
      console.log(`  INCONSISTENCY: ${inc}`);
    }
    if (!r.fatal.length && !r.inconsistencies.length) {
      console.log('  OK: no inconsistencies in audited window');
    }
  }

  if (hasFatal) process.exit(2);
  if (hasInconsistency) process.exit(1);

  console.log('\nAudit completed successfully.');
})();
