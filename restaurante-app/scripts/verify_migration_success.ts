
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
// Using Service Role Key for verification to bypass RLS policies
const serviceRoleKey = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
    console.log('🔍 Verifying Data Migration status...');

    // 1. Check Companies
    const { count: companiesCount, error: errComp } = await supabase.from('companies').select('*', { count: 'exact', head: true });

    if (errComp) {
        console.error('❌ Error accessing companies table:', errComp.message);
    } else {
        console.log(`✅ Companies Table: ${companiesCount} rows`);
    }

    // 2. Check Products
    const { count: productsCount, error: errProd } = await supabase.from('products').select('*', { count: 'exact', head: true });

    if (errProd) {
        console.error('❌ Error accessing products table:', errProd.message);
    } else {
        console.log(`✅ Products Table: ${productsCount} rows`);
    }

    // 3. Sample Data
    if (companiesCount && companiesCount > 0) {
        const { data: comp } = await supabase.from('companies').select('name, id').limit(1).single();
        console.log(`   Sample Company: "${comp?.name}" (ID: ${comp?.id})`);
    }
}

verify();
