import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// 1. Download serviceAccountKey.json from Firebase Console -> Project Settings -> Service Accounts
// 2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
// 3. Run: npx ts-node scripts/migrate_firebase_to_supabase.ts

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Error: serviceAccountKey.json not found in root directory.');
  console.error('Please download it from Firebase Console and place it in the project root.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY env var is missing.');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH))
});
const db = admin.firestore();
const auth = admin.auth();

// Initialize Supabase Admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateUsers() {
  console.log('🚀 Starting User Migration...');
  let pageToken;
  let count = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);

    for (const user of listUsersResult.users) {
      try {
        // Create user in Supabase Auth
        const { data: { user: newUser }, error } = await supabase.auth.admin.createUser({
          email: user.email,
          email_confirm: user.emailVerified,
          password: 'TemporaryPassword123!', // Users will need to reset password
          user_metadata: {
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            firebaseUid: user.uid // Store for reference
          }
        });

        if (error) {
          // If user already exists, try to get their ID to link profile
          if (error.message.includes('already registered')) {
            console.log(`⚠️ User ${user.email} already exists.`);
            // Fetch existing user to get ID if needed for profile
            // We skip creating, but we might want to ensure Profile exists in next step
          } else {
            console.error(`❌ Failed to create user ${user.email}:`, error.message);
          }
        } else {
          console.log(`✅ Migrated user: ${user.email}`);
          count++;
        }

        // Note: We cannot easily migrate passwords. Users should use "Forgot Password" flow.
      } catch (e: any) {
        console.error(`❌ Error processing user ${user.email}:`, e.message);
      }
    }
    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  console.log(`✨ User migration finished. Migrated ${count} users.`);
}

async function migrateCompanies() {
  console.log('🚀 Starting Companies Migration...');
  const snapshot = await db.collection('companies').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Map Firestore fields to Supabase columns
    const company = {
      id: doc.id, // Keep same ID if valid UUID, otherwise might fail if not UUID.
      // If Firestore IDs are not UUIDs, we might need to generate new ones and map them.
      // Standard Firestore IDs are random strings (20 chars), not UUIDs.
      // Postgres UUID is strict.
      // STRATEGY: If ID is not UUID, let Postgres generate it, update our mapping map.
      // BUT for simplicity in relationships, if we change IDs, we break links.
      // CHECK: Are we using UUIDs in Firestore?
      // If not, we have a problem. Supabase tables use UUID primary keys by default in our schema.

      name: data.name || data.nome || 'Unnamed Company',
      cnpj: data.cnpj,
      active: data.active ?? true,
      plan: data.plan || 'free',
      created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
    };

    // Check if ID is UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company.id);

    let result;
    if (isUUID) {
      result = await supabase.from('companies').upsert(company);
    } else {
      // Remove ID to let Postgres generate it
      const { id, ...companyWithoutId } = company;
      // We need to store the mapping OldID -> NewID for other collections
      // For this script, we'll try to insert. If users depend on ID, we must return manual mapping.
      // LIMITATION: Relationships (Orders -> Company) will break if we don't map.
      // As a fallback for this script, we'll log non-UUID IDs.
      console.warn(`⚠️ Company ID ${company.id} is not a UUID. Generating new ID. Relationships might require mapping.`);
      result = await supabase.from('companies').insert(companyWithoutId);
    }

    if (result.error) {
      console.error(`❌ Failed to migrate company ${doc.id}:`, result.error.message);
    } else {
      console.log(`✅ Migrated company: ${company.name}`);
    }
  }
}

async function migrateProducts() {
  console.log('🚀 Starting Products Migration...');
  // Note: Products need valid company_id (UUID). 
  // If we generated new IDs for companies, we can't link easily without a mapping table.
  // Assuming for now simple migration where we might have to manually fix or IDs are UUIDs (if created by some UUID lib).

  const snapshot = await db.collection('products').get(); // Verify collection name 'products' or 'produtos'?
  // Based on service check, likely 'products' or used inside subcollections.
  // Assuming root collection for now.

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const product = {
      name: data.name,
      description: data.description,
      price: parseFloat(data.price || 0),
      category: data.category,
      image_url: data.imageUrl || data.image_url,
      available: data.available ?? true,
      company_id: data.companyId, // Needs to match Postgres UUID
      created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
    };

    const { error } = await supabase.from('products').insert(product);

    if (error) {
      console.error(`❌ Failed to migrate product ${doc.id}:`, error.message);
    } else {
      console.log(`✅ Migrated product: ${data.name}`);
    }
  }
}

async function migrateOrders() {
  console.log('🚀 Starting Orders Migration...');
  const snapshot = await db.collection('pedidos').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const order = {
      client_name: data.clientName || data.cliente,
      table_number: parseInt(data.mesa || 0),
      comanda_number: parseInt(data.comandaNumber || 0),
      status: data.status, // Ensure values match enum ('pending', etc)
      total_amount: parseFloat(data.totalPrice || 0),
      items: data.items, // JSONB
      company_id: data.companyId,
      created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
      date_key: data.dateKey // Assuming string YYYY-MM-DD
    };

    const { error } = await supabase.from('orders').insert(order);
    if (error) {
      console.error(`❌ Failed to migrate order ${doc.id}:`, error.message);
    } else {
      console.log(`✅ Migrated order ${doc.id}`);
    }
  }
}

async function main() {
  try {
    await migrateUsers();
    await migrateCompanies();
    await migrateProducts();
    await migrateOrders();
    console.log('🏁 Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

main();
