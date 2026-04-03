import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load .env.test
const envPath = path.resolve(__dirname, '../.env.test');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.TEST_SUPABASE_URL;
const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_ROLE_KEY in .env.test');
    console.error('Make sure these variables are set to run the seed script.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

function resolveSeedUserEmail(): string {
    const configured = process.env.TEST_SEED_USER_EMAIL?.trim();
    if (configured) return configured;

    const localPart = `seed-${crypto.randomBytes(6).toString('hex')}`;
    return `${localPart}@example.invalid`;
}

async function seed() {
    console.log('Starting DB Seed...');

    // 1. Check/Create Company
    console.log('Checking for company...');
    let companyId: string;

    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

    if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        process.exit(1);
    }

    if (companies && companies.length > 0) {
        companyId = companies[0].id;
        console.log(`Using existing company: ${companyId}`);
    } else {
        console.log('No company found. Creating new company...');
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
            console.error('Error creating company:', createError);
            process.exit(1);
        }
        companyId = newCompany.id;
        console.log(`Created company: ${companyId}`);
    }

    // 2. Check/Create User
    const email = resolveSeedUserEmail();
    console.log(`Checking for user: ${email}...`);
    
    let userId: string;
    
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
        console.error('Error listing users:', listUsersError);
        process.exit(1);
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        userId = existingUser.id;
        console.log(`Using existing user: ${userId}`);
    } else {
        console.log('User not found. Creating new user...');
        const seedUserPassword = process.env.TEST_SEED_USER_PASSWORD || `seed-${crypto.randomBytes(12).toString('hex')}`;
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
            email: email,
            password: seedUserPassword,
            email_confirm: true
        });

        if (createUserError) {
            console.error('Error creating user:', createUserError);
            process.exit(1);
        }
        userId = newUser.user.id;
        console.log(`Created user: ${userId}`);
    }

    // 3. Check/Create Profile
    console.log('Checking for profile...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profile) {
        console.log('Profile exists.');
        if (profile.company_id !== companyId) {
            console.log('Updating profile company_id...');
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ company_id: companyId })
                .eq('id', userId);
            
            if (updateError) console.error('Error updating profile:', updateError);
            else console.log('Profile updated.');
        }
    } else {
        console.log('Creating profile...');
        const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                company_id: companyId,
                email: email,
                full_name: 'Test User',
                role: 'admin',
                active: true
            });

        if (createProfileError) {
            console.error('Error creating profile:', createProfileError);
            process.exit(1);
        }
        console.log('Profile created.');
    }

    console.log('Seed completed successfully!');
}

seed().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
