
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function openRegister() {
    console.log('🔓 Opening Cash Register for today...');

    // 1. Login
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (loginError || !user) {
        console.error('❌ Login failed:', loginError?.message);
        return;
    }

    // 2. Get Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) { console.error('No profile'); return; }

    // 3. Check if already open
    const { data: existing } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('status', 'aberto');

    if (existing && existing.length > 0) {
        console.log('✅ Cash register is ALREADY OPEN. No action needed.');
        console.log(`   ID: ${existing[0].id}, Date: ${existing[0].date_key}`);
        return;
    }

    // 4. Open it
    const { data, error } = await supabase
        .from('cash_registers')
        .insert({
            company_id: profile.company_id,
            opened_by: user.id,
            opened_by_name: profile.full_name || 'Admin',
            initial_value: 100.00,
            expected_balance: 100.00,
            status: 'aberto',
            sales_by_method: { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Failed to open register:', error.message);
    } else {
        console.log('✅ Cash Register OPENED Successfully!');
        console.log(`   ID: ${data.id}`);
    }
}

openRegister();
