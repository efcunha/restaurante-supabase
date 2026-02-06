
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');
const OUTPUT_FILE = path.join(__dirname, '../migration_dump.sql');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ serviceAccountKey.json not found');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH))
});
const db = admin.firestore();

// Helper to escape SQL strings
const escape = (str: any) => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'boolean') return str ? 'TRUE' : 'FALSE';
    if (typeof str === 'number') return str;
    if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`; // JSONB
    return `'${String(str).replace(/'/g, "''")}'`;
};

async function generateSQL() {
    console.log('📦 Reading Firebase Data...');
    let sql = '-- MIGRATION DUMP generated from Firebase\n\n';
    sql += 'BEGIN;\n\n'; // Transaction

    // Map to store company ID mapping
    const companyIdMap = new Map<string, string>();

    // 1. Companies
    console.log('  > Processing Companies...');
    const companiesSnap = await db.collection('companies').get();
    for (const doc of companiesSnap.docs) {
        const d = doc.data();

        let newId = doc.id;
        // Check if ID is UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.id)) {
            newId = require('crypto').randomUUID();
        }

        // Store mapping
        companyIdMap.set(doc.id, newId);

        // Handle potentially missing fields safely
        const plan = d.plan || d.plano || 'free';
        const active = d.active ?? true;
        const createdAt = (d.createdAt && d.createdAt.seconds)
            ? new Date(d.createdAt.seconds * 1000).toISOString()
            : new Date().toISOString();

        // Create Mapping comment if we generated a new ID
        if (newId !== doc.id) { // Check if a new UUID was generated
            sql += `-- Original Firestore ID for Company: ${doc.id} mapped to new UUID: ${newId}\n`;
        }

        sql += `INSERT INTO public.companies (id, name, cnpj, plan, active, created_at) VALUES (${escape(newId)}, ${escape(d.name || d.nome || 'Unnamed')}, ${escape(d.cnpj)}, ${escape(plan)}, ${escape(active)}, ${escape(createdAt)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';

    // 2. Products
    console.log('  > Processing Products...');

    for (const doc of companiesSnap.docs) {
        const companyId = companyIdMap.get(doc.id); // Retrieve from Map
        if (!companyId) {
            console.error(`❌ No mapping found for company ${doc.id}`);
            continue;
        }

        console.log(`    > Fetching products for company ${doc.id} (New ID: ${companyId})...`);

        const cardapioSnap = await doc.ref.collection('cardapio').get();
        console.log(`      Found ${cardapioSnap.size} products.`);

        for (const prodDoc of cardapioSnap.docs) {
            const pd = prodDoc.data();
            const createdAt = (pd.createdAt && pd.createdAt.seconds)
                ? new Date(pd.createdAt.seconds * 1000).toISOString()
                : new Date().toISOString();

            sql += `INSERT INTO public.products (company_id, name, description, price, category, image_url, available, created_at) VALUES (${escape(companyId)}, ${escape(pd.name)}, ${escape(pd.description)}, ${pd.price || 0}, ${escape(pd.category)}, ${escape(pd.imageUrl || pd.image_url)}, ${escape(pd.available ?? true)}, ${escape(createdAt)});\n`;
        }
    }

    // 3. Orders
    console.log('  > Processing Orders...');
    const ordersSnap = await db.collection('pedidos').get();

    sql += '\nCOMMIT;\n';

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`✅ SQL Dump created at: ${OUTPUT_FILE}`);
}

generateSQL();
