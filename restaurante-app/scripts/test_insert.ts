
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log('Testing INSERT into companies...');

    const dummyCompany = {
        name: 'Test Company',
        cnpj: '00000000000191',
        active: true,
        plan: 'free'
    };

    const { data, error } = await supabase.from('companies').insert(dummyCompany).select();

    if (error) {
        console.error('❌ INSERT FAILED:', error);
    } else {
        console.log('✅ INSERT SUCCESS:', data);
    }
}

testInsert();
