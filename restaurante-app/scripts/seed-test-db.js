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

// Check if KEY looks like a JWT
if (!supabaseServiceKey.startsWith('ey')) {
    console.error('ERROR: TEST_SUPABASE_SERVICE_ROLE_KEY does not start with "ey". It must be a JWT Service Role Key, not a "sb_secret_".');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verifyAndRepair() {
    console.log('--- Starting System Verification ---');
    console.log(`Connecting to: ${supabaseUrl}`);

    // 1. Verify Company
    console.log('\n1. Checking Companies...');
    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .limit(5);

    if (companiesError) {
        console.error('FAIL: Could not fetch companies. Check your Key permissions.', companiesError);
        process.exit(1);
    }

    let companyId;
    if (companies.length === 0) {
        console.warn('WARN: No companies found. Creating one...');
        const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
                name: 'Test Company',
                document: '00000000000000',
                document_type: 'cnpj',
                active: true,
                settings: {}
            })
            .select()
            .single();
        
        if (createError) {
             console.error('FAIL: Could not create company.', createError);
             process.exit(1);
        }
        companyId = newCompany.id;
        console.log(`SUCCESS: Created company ${companyId}`);
    } else {
        companyId = companies[0].id;
        console.log(`SUCCESS: Found company: ${companies[0].name} (${companyId})`);
    }

    // 2. Verify Users (Supabase Auth)
    console.log('\n2. Checking Auth Users...');
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
        console.error('FAIL: Could not list users. Your Service Role Key might not have auth.admin permissions.', listUsersError);
        process.exit(1);
    }

    if (users.length === 0) {
        console.error('FAIL: No users found in Auth. Please create a user in Supabase Dashboard > Authentication.');
        // Try creating one
        console.log('Attempting to create user test@example.com...');
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
            email: 'test@example.com',
            password: 'password123',
            email_confirm: true
        });
        if (createUserError) {
             console.error('FAIL: Could not create user.', createUserError);
             process.exit(1);
        }
        console.log(`SUCCESS: Created user ${newUser.user.id}`);
        users.push(newUser.user);
    } else {
        console.log(`SUCCESS: Found ${users.length} users.`);
        users.forEach(u => console.log(` - ${u.email} (${u.id})`));
    }

    // 3. Verify Profiles
    console.log('\n3. Checking Profiles...');
    const targetUser = users[0]; // Pick the first user
    console.log(`Targeting user: ${targetUser.email} (${targetUser.id})`);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('FAIL: Error fetching profile.', profileError);
    }

    if (!profile) {
        console.warn(`WARN: No profile found for ${targetUser.email}. Creating...`);
        const { error: insertProfileError } = await supabase
            .from('profiles')
            .insert({
                id: targetUser.id,
                company_id: companyId,
                email: targetUser.email,
                full_name: 'Test User',
                role: 'admin',
                active: true
            });
        
        if (insertProfileError) {
            console.error('FAIL: Could not create profile.', insertProfileError);
            process.exit(1);
        }
        console.log('SUCCESS: Profile created.');
    } else {
        console.log('SUCCESS: Profile exists.');
        console.log(JSON.stringify(profile, null, 2));

        if (profile.company_id !== companyId) {
            console.warn(`WARN: Profile company_id mismatch. Expected ${companyId}, got ${profile.company_id}. Fixing...`);
             const { error: updateError } = await supabase
                .from('profiles')
                .update({ company_id: companyId })
                .eq('id', targetUser.id);
            if (updateError) console.error('FAIL: Could not update profile.', updateError);
            else console.log('SUCCESS: Profile linked to company.');
        } else {
            console.log('SUCCESS: Profile correctly linked to company.');
        }
    }
    
    // Final Check mimicking the test
    console.log('\n4. Final Test Simulation...');
    const { data: testQuery } = await supabase
            .from('profiles')
            .select('company_id, id')
            .limit(1)
            .single();
            
    if (!testQuery) {
        console.error('FAIL: Test query returned null! The test WILL fail.');
    } else {
        console.log('SUCCESS: Test query returned data:', testQuery);
        console.log('--- READY FOR TESTING ---');
    }
}

verifyAndRepair().catch(err => {
    console.error('Unexpected error:', err);
});
