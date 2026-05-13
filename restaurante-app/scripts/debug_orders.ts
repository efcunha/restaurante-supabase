
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';

// Load env
dotenv.config({ path: join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper from app
function normalizeComandaNumber(comandaNumber: string | number): string {
    const str = String(comandaNumber).trim();
    const normalized = str.replace(/^0+/, '') || '0';
    return normalized;
}

function getTodayKey(): string {
    const now = new Date();
    // Assuming local time for simple debug, or UTC if that's what app uses
    // App uses getLocalDateKey which does YYYY-MM-DD
    const iso = now.toISOString().split('T')[0];
    return iso;
}

async function run() {
    console.log('Fetching orders...');
    
    // Hardcode companyId from user context if possible, or fetch simple list
    // Since I don't have user context easily, I'll fetch ALL orders for today and group them
    const today = getTodayKey(); 
    
    // We can try to guess the date or just fetch recent orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Fetched ${orders.length} orders.`);

    const comandasMap: Record<string, any> = {};

    orders.forEach((order) => {
        // Only care about one company to reduce noise if multiple
        // But for debug let's process all
        
        const rawComandaNumber = order.comanda_number;
        const comandaNum = normalizeComandaNumber(rawComandaNumber);
        
        if (!comandasMap[comandaNum]) {
            comandasMap[comandaNum] = {
                comandaNumber: comandaNum,
                pedidos: []
            };
        }
        
        comandasMap[comandaNum].pedidos.push({
            id: order.id,
            totalPrice: order.total_amount,
            items: order.items,
            rawComanda: rawComandaNumber
        });
    });

    console.log('\n--- COMANDA SUMMARY ---');
    Object.values(comandasMap).forEach((c: any) => {
        console.log(`\nComanda #${c.comandaNumber}`);
        c.pedidos.forEach((p: any) => {
            console.log(`   - Order ${p.id} (Raw: ${p.rawComanda}) Items: ${JSON.stringify(p.items)}`);
        });
    });
}

run();
