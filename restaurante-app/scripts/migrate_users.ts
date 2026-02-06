
import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// 1. Initialize Firebase Admin
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
    });
}

// 2. Initialize Supabase Admin (Service Role)
const SUPABASE_URL = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_St6H0bKHcL7VFfjTY2x5Rg_bx4eTHlU';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function migrateUsers() {
    console.log('🚀 Starting User Migration (FORCE UPDATE MODE)...');

    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users;

        console.log(`📋 Found ${users.length} users in Firebase.`);

        for (const user of users) {
            const email = user.email;
            if (!email) {
                console.log(`⚠️  Skipping user ${user.uid} (no email)`);
                continue;
            }

            console.log(`Processing user: ${email}...`);

            // Try to create user
            const { data: newUser, error } = await supabase.auth.admin.createUser({
                email: email,
                password: 'mudar123',
                email_confirm: true,
                user_metadata: {
                    firebase_uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                }
            });

            let finalUserId = newUser?.user?.id;

            if (error) {
                if (error.message.includes('already registered') || error.status === 422) {
                    console.log(`   ℹ️  User ${email} already exists. DELETING and RE-CREATING to force password update...`);

                    // 1. Find User by listing (small scale solution)
                    const { data: { users: sbUsers } } = await supabase.auth.admin.listUsers();
                    const existingUser = sbUsers.find(u => u.email === email);

                    if (existingUser) {
                        // DELETE
                        await supabase.auth.admin.deleteUser(existingUser.id);
                        console.log(`      🗑️  Deleted old user ${existingUser.id}`);

                        // RE-CREATE
                        const { data: recreatedUser, error: recreateError } = await supabase.auth.admin.createUser({
                            email: email,
                            password: 'mudar123',
                            email_confirm: true,
                            user_metadata: { firebase_uid: user.uid, displayName: user.displayName }
                        });

                        if (recreateError) {
                            console.error(`      ❌ Failed to re-create user: ${recreateError.message}`);
                            continue;
                        }

                        finalUserId = recreatedUser.user.id;
                        console.log(`      ✅ Re-created user ${email} (New ID: ${finalUserId})`);
                    }
                } else {
                    console.error(`   ❌ Failed to create user ${email}:`, error.message);
                    continue;
                }
            } else {
                console.log(`   ✅ Created user ${email} (ID: ${finalUserId}) - Temp Password: 'mudar123'`);
            }

            // Link Profile
            if (finalUserId) {
                const companyId = '37850e10-933b-49e4-bb72-656c74035167';
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: finalUserId,
                    email: email,
                    full_name: user.displayName || email.split('@')[0],
                    role: 'manager',
                    company_id: companyId
                });

                if (profileError) {
                    console.error(`      ⚠️ Failed to link profile:`, profileError.message);
                } else {
                    console.log(`      👤 Profile linked to Company ID: ${companyId}`);
                }
            }
        }

        console.log('✨ User Migration Completed.');

    } catch (error) {
        console.error('🔥 Fatal Error during migration:', error);
    }
}

migrateUsers();
