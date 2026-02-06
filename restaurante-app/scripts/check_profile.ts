
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
// Using Service Role Key to inspect DB truth (bypassing RLS)
const serviceRoleKey = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProfile() {
    const userId = '471cb7c6-0c73-42e6-8afd-8bd10d8a3b50'; // From user error log

    console.log(`🔍 Checking profile for User ID: ${userId}`);

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('❌ Error or Not Found:', error);
    } else {
        console.log('✅ Profile Found:', data);
    }
}

checkProfile();
