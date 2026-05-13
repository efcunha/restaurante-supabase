
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper from app
function normalizeComandaNumber(comandaNumber) {
    const str = String(comandaNumber).trim();
    const normalized = str.replace(/^0+/, '') || '0';
    return normalized;
}

function getTodayKey() {
    const now = new Date();
    // Assuming local time for simple debug, or UTC if that's what app uses
    const iso = now.toISOString().split('T')[0];
    return iso;
}

async function run() {
    console.log('Fetching orders...');
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Fetched ${orders.length} orders.`);

    const comandasMap = {};

    (orders || []).forEach((order) => {
        const rawComandaNumber = order.comanda_number;
        const comandaNum = normalizeComandaNumber(rawComandaNumber);
        
        if (!comandasMap[comandaNum]) {
            comandasMap[comandaNum] = {
                comandaNumber: comandaNum,
                pedidos: []
            };
        }
        
        const mappedOrder = {
            id: order.id,
            totalPrice: order.total_amount,
            items: order.items,
            rawComanda: rawComandaNumber,
            client: order.client_name
        };

        comandasMap[comandaNum].pedidos.push(mappedOrder);
    });

    console.log('\n--- COMANDA SUMMARY ---');
    Object.values(comandasMap).forEach((c) => {
        console.log(`\nComanda #${c.comandaNumber}`);
        c.pedidos.forEach((p) => {
            console.log(`   - Order ${p.id} (Raw: ${p.rawComanda}) Client: ${p.client} Items: ${JSON.stringify(p.items)}`);
        });
    });
}

run();
