
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testRpc() {
    console.log('🧪 Testing get_my_company_id()...');

    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (loginError) { console.error(loginError); return; }

    const { data, error } = await supabase.rpc('get_my_company_id');

    if (error) {
        console.error('❌ RPC Failed:', error.message);
    } else {
        console.log('✅ RPC Result:', data);
    }
}

testRpc();
