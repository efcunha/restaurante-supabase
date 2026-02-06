
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
// Using ANON KEY (Public) to simulate the App
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey);

async function verifyAnonAccess() {
    console.log('🕵️ Simulating App User Login...');

    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (authError) {
        console.error('❌ Login Failed:', authError.message);
        return;
    }

    const userId = authData.session?.user?.id;
    console.log(`✅ Login Success! User ID: ${userId}`);

    // 2. Fetch Profile (Simulating AuthContext)
    console.log('⏳ Fetching profile (as User)...');

    // Set a timeout to detect hanging
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000));

    try {
        const fetchPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) {
            console.error('❌ Profile Fetch Error:', error);
        } else {
            console.log('✅ Profile Fetch Success:', data);
        }

    } catch (err) {
        console.error('🔥 Fatal Error or Timeout:', err);
    }
}

verifyAnonAccess();
