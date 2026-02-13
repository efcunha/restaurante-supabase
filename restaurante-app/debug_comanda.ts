
import { supabase } from './src/config/SupabaseConfig';
import { getLocalDateKey } from './src/utils/dateUtils';

async function debugComanda() {
  const comandaNumber = '2'; // User mentioned Comanda 2
  const dateKey = getLocalDateKey();
  
  console.log(`--- Debugging Comanda ${comandaNumber} for date ${dateKey} ---`);

  // 1. Fetch Comanda
  const { data: comandas, error: comandaError } = await supabase
    .from('comandas')
    .select('*')
    .eq('comanda_number', comandaNumber)
    .eq('date_key', dateKey);

  if (comandaError) {
    console.error('Error fetching comanda:', comandaError);
    return;
  }

  if (!comandas || comandas.length === 0) {
    console.log('No comanda found with this number today.');
    
     const { data: allComandas } = await supabase
        .from('comandas')
        .select('*')
        .eq('comanda_number', comandaNumber)
        .order('created_at', { ascending: false })
        .limit(1);
     
     if (allComandas && allComandas.length > 0) {
         console.log('Found an older comanda 2:', allComandas[0]);
     }
     return;
  }

  const comanda = comandas[0];
  console.log('Comanda Data:', JSON.stringify(comanda, null, 2));

  // 2. Fetch Orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', comanda.company_id)
    .eq('comanda_number', comandaNumber)
    .eq('date_key', dateKey);

  console.log(`Found ${orders?.length} orders.`);
  
  let totalCalculated = 0;
  let paidCalculated = 0;
  
  if (orders) {
    orders.forEach(o => {
        console.log(`Order ${o.id}: Status=${o.status}, Paid=${o.is_paid}, Total=${o.total_amount}`);
        if (o.status !== 'cancelled') {
            totalCalculated += Number(o.total_amount);
            if (o.is_paid) paidCalculated += Number(o.total_amount);
        }
    });

    console.log(`Calculated from Orders -> Total: ${totalCalculated}, Paid: ${paidCalculated}`);
    console.log(`Comanda Data -> Total: ${comanda.total_consumed}, Paid: ${comanda.total_paid}, Open: ${comanda.open_balance}`);
  }
}

debugComanda();
