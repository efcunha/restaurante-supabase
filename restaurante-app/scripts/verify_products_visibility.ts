
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyProducts() {
    console.log('🥘 Verifying Menu Access (RLS Check)...');

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
    console.log(`✅ Logged in as ${user?.email} (${user?.id})`);

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
    console.log(`🏢 User belongs to Company: ${profile.company_id}`);

    // 3. Try to fetch Products for this Company
    console.log('⏳ Fetching products...');

    const { data: products, error: prodError, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id);

    if (prodError) {
        console.error('❌ Error fetching products:', prodError.message);
        console.error('   👉 This likely means RLS policies are blocking access.');
    } else {
        console.log(`✅ Success! Found ${products?.length} products. (Total in DB: ${count})`);
        if (products?.length === 0) {
            console.warn('⚠️  Query succeeded but returned 0 items. Checking if any exist using Service Role...');
            // Trigger deeper check? No, just warn.
        } else {
            console.log('   Sample Product:', products?.[0].name);
        }
    }
}

verifyProducts();
