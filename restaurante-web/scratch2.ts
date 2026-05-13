import { supabase } from './src/config/SupabaseConfig';
import { getLocalDateKey } from './src/utils/dateUtils';

async function testDeliveryGrouping() {
    const { data: o } = await supabase
        .from('orders')
        .select('*')
        .eq('date_key', getLocalDateKey())
        .limit(10);

    console.log(JSON.stringify(o, null, 2));
}
testDeliveryGrouping();
