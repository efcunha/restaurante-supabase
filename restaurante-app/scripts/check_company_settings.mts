
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSettings() {
    console.log('🔍 Checking Company Settings...');

    // 1. Login
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }

    const user = auth.session?.user;
    console.log(`✅ Logged in as ${user?.email}`);

    // 2. Get User Profile to find Company ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.company_id) {
        console.error('❌ No company_id found in profile!');
        return;
    }
    console.log(`🏢 Company ID: ${profile.company_id}`);

    // 3. Fetch Company and Settings
    const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

    if (error) {
        console.error('❌ Error fetching company:', error.message);
    } else {
        console.log('✅ Company Found:', company.name);
        console.log('⚙️  Settings Column:', JSON.stringify(company.settings, null, 2));

        if (!company.settings || Object.keys(company.settings).length === 0 || JSON.stringify(company.settings) === '{}') {
            console.warn('⚠️  Settings are EMPTY or NULL!');
        } else {
            const s = company.settings;
            console.log(`   - Caldos: ${s.temperosCaldos?.length} items`);
            console.log(`   - Comidas: ${s.temperosComidas?.length} items`);
            console.log(`   - Pizza Sizes: ${s.pizzaConfig?.sizes?.length} items`);
        }
    }
}

checkSettings();
