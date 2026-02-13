
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from SupabaseConfig.ts for debugging purposes
const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x'; // Note: This looks like a truncated key in the source file, or maybe just a placeholder. 
// Wait, looking at the previous file content: 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x'
// It seems short for an anon key, but I'll try it. If it fails, I'll know.
// Actually, 'sb_publishable_' usually implies a different format. 
// Let me check if there is an .env file I can read instead.

// However, if the user is running the app with this config, it must work.
// I'll try to use it.

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getTodayKey() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

async function run() {
    console.log('--- Debugging Comanda 2 ---');
    const today = getTodayKey();
    console.log('Date Key:', today);

    // 1. Fetch Comandas with number 2
    const { data: comandas, error } = await supabase
        .from('comandas')
        .select('*')
        .eq('comanda_number', '2')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching comandas:', error);
        return;
    }

    console.log(`Found ${comandas.length} comandas with number 2.`);

    for (const c of comandas) {
        console.log(`\nID: ${c.id}`);
        console.log(`Date Key: ${c.date_key} (Today is ${today})`);
        console.log(`Status: ${c.status}`);
        console.log(`Open Balance: ${c.open_balance}`);
        console.log(`Total Consumed: ${c.total_consumed}`);
        console.log(`Total Paid: ${c.total_paid}`);
        console.log(`Created At: ${c.created_at}`);
        
        // Fetch orders for this comanda
        const { data: orders } = await supabase
            .from('orders')
            .select('id, total_amount, is_paid, status, items')
            .eq('comanda_number', '2') // Use string '2'
            .eq('company_id', c.company_id)
            .eq('date_key', c.date_key); // Match the comanda's date key

        if (orders) {
            const totalOrders = orders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? Number(o.total_amount) : 0), 0);
            const paidOrders = orders.reduce((acc, o) => acc + (o.is_paid && o.status !== 'cancelled' ? Number(o.total_amount) : 0), 0);
            console.log(`Orders Count: ${orders.length}`);
            console.log(`Orders Total: ${totalOrders}`);
            console.log(`Orders Paid: ${paidOrders}`);
            
            const unpaidOrders = orders.filter(o => !o.is_paid && o.status !== 'cancelled');
            if (unpaidOrders.length > 0) {
                console.log('Unpaid Active Orders:', unpaidOrders.map(o => ({ id: o.id, amount: o.total_amount })));
            } else {
                console.log('All active orders are paid.');
            }
        }
    }
}

run();
