
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function debugToggle() {
    console.log('🐞 Debugging Product Toggle Update...');

    // 1. Login
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (loginError || !user) {
        console.error('❌ Login failed:', loginError?.message);
        return;
    }
    console.log(`✅ Logged in as ${user.id}`);

    // 2. Check Profile Role and Company
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Failed to fetch profile:', profileError.message);
    } else {
        console.log('👤 Profile:', { company_id: profile.company_id, role: profile.role });
    }

    // 2b. Check result of get_my_company_id (via RPC if possible, or inference)
    // We can't call it directly unless we made it exposed as RPC or use it in a query.
    // Let's fallback to query.

    // 3. Find a product to toggle
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', profile?.company_id)
        .limit(1);

    if (!products || products.length === 0) {
        console.error('❌ No products found to test update!');
        return;
    }

    const prod = products[0];
    console.log(`📦 Testing with Product: [${prod.name}] (ID: ${prod.id}) (Active: ${prod.active})`);

    // 4. Try UPDATE
    const newActiveState = !prod.active;
    console.log(`🔄 Attempting to set active = ${newActiveState}...`);

    const { data: updateData, error: updateError, count } = await supabase
        .from('products')
        .update({ active: newActiveState })
        .eq('id', prod.id)
        .select(); // Add select to return the updated record

    if (updateError) {
        console.error('❌ Update FAILED with error:', updateError.message);
        console.error('   Hint: Check RLS Policies.');
    } else {
        console.log(`✅ Update call completed.`);
        console.log(`   - Rows returned: ${updateData?.length}`);
        // console.log(`   - Count (if enabled): ${count}`); 

        if (updateData && updateData.length > 0) {
            console.log(`   - New State: active=${updateData[0].active}`);
        } else {
            console.error('❌ Update returned NO data! (0 rows updated?)');
            console.error('   This usually means RLS matched 0 rows.');
        }
    }
}

debugToggle();
