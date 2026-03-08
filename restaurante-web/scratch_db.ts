import { supabase } from './src/config/SupabaseConfig';

async function verify() {
    const { data } = await supabase.from('orders').select('*').limit(10).order('created_at', { ascending: false });
    console.log(data?.map(o => ({
        id: o.id,
        type: o.order_type,
        comanda: o.comanda_number,
        items: o.items_with_status
    })));
    process.exit(0);
}

verify();
