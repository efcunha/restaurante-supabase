
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function listarCaixas() {
    console.log('🔍 Buscando caixas...');
    const snapshot = await db.collection('caixas').orderBy('data', 'desc').limit(5).get();

    if (snapshot.empty) {
        console.log('❌ Nenhum caixa encontrado.');
        return;
    }

    console.log(`✅ Encontrados ${snapshot.size} caixas recentes:`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n📄 ID: ${doc.id}`);
        console.log(`   Data: ${data.data}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   AbertoPor: ${data.abertoPorNome}`);
        console.log(`   Timestamp: ${data.abertoAt ? data.abertoAt.toDate() : 'N/A'}`);
    });

    // Imprimir data do sistema para comparação
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    console.log('\n🕒 Data do Sistema (Node.js):', dateKey);
}

listarCaixas().then(() => process.exit(0));
