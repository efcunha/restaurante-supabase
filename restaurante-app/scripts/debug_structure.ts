
import * as admin from 'firebase-admin';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH))
});
const db = admin.firestore();

async function checkStructure() {
    const companies = await db.collection('companies').limit(1).get();
    if (companies.empty) {
        console.log('No companies found.');
        return;
    }

    const company = companies.docs[0];
    console.log(`Checking company: ${company.id}`);

    const collections = await company.ref.listCollections();
    console.log('Subcollections:', collections.map(c => c.id));

    console.log('--- ROOT COLLECTIONS ---');
    const rootCols = await db.listCollections();
    console.log(rootCols.map(c => c.id));

    console.log('--- CHECKING SUBCOLLECTIONS CONTENT ---');
    const cardapioSnap = await company.ref.collection('cardapio').limit(5).get();
    console.log(`cardapio count (limit 5): ${cardapioSnap.size}`);
    const rootOrders = await db.collection('pedidos').limit(1).get();
    console.log(`Root 'pedidos' count (limit 1): ${rootOrders.size}`);
}

checkStructure();
