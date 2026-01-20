const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
  credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

const RISOTOS = [
  { name: 'Risoto de Camarão', price: 25, category: 'comida', active: true },
  { name: 'Risoto de Charque', price: 20, category: 'comida', active: true },
  { name: 'Risoto de Frango', price: 20, category: 'comida', active: true },
  { name: 'Risoto de Queijo', price: 20, category: 'comida', active: true },
];

async function adicionarRisotos() {
  try {
    console.log('📝 Adicionando risotos ao cardápio...\n');
    
    const batch = db.batch();
    
    for (const item of RISOTOS) {
      const docRef = db.collection('cardapio').doc();
      batch.set(docRef, item);
      console.log(`   ✓ ${item.name} - R$ ${item.price}`);
    }
    
    await batch.commit();
    
    console.log(`\n✅ ${RISOTOS.length} risotos adicionados com sucesso!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

adicionarRisotos();
