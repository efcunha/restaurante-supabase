const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test
const envPath = path.resolve(__dirname, '../.env.test');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.TEST_SUPABASE_URL;
const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_ROLE_KEY in .env.test');
    process.exit(1);
}

// DIAGNOSTIC 1: Check JWT Role
console.log('\n--- DIAGNOSTIC: Checking Key ---');
try {
    const parts = supabaseServiceKey.split('.');
    if (parts.length !== 3) {
        console.error('ERROR: Key is not a valid JWT (does not have 3 parts).');
    } else {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('Key Role:', payload.role);
        console.log('Key Iss:', payload.iss);
        
        if (payload.role !== 'service_role') {
            console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('CRITICAL ERROR: The provided key is NOT a service_role key!');
            console.error(`Current Role: "${payload.role}" (Expected: "service_role")`);
            console.error('You have likely copied the "anon" key by mistake.');
            console.error('Please go to Supabase > Settings > API and copy the "service_role" secret.');
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
            process.exit(1);
        } else {
            console.log('Key Role is correct (service_role).');
        }
    }
} catch (e) {
    console.error('Error decoding JWT:', e.message);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verifyAndRepair() {
    console.log('\n--- Starting System Verification ---');
    console.log(`Connecting to: ${supabaseUrl}`);

    // 1. Verify Company
    console.log('\n1. Checking Companies...');
    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .limit(5);

    if (companiesError) {
        console.error('FAIL: Could not fetch companies.', companiesError);
        console.log('Tip: Even with service_role, RLS might be active. But service_role should bypass.');
        process.exit(1);
    }
    console.log(`SUCCESS: Found ${companies.length} companies.`);
    
    // ... rest of checking logic only if we pass step 1
    if (companies.length > 0) {
        console.log(`Company ID: ${companies[0].id}`);
    }

    // 2. Verify Auth User logic if possible...
    // Only continue if we have access.
}

verifyAndRepair().catch(err => {
    console.error('Unexpected error:', err);
});
