const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function adicionar() {
  try {
    // Buscar caldos existentes
    const caldosSnap = await db.collection('cardapio')
      .where('category', '==', 'caldo')
      .get();
    
    console.log('📋 Caldos atuais:');
    caldosSnap.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name}: R$ ${data.price}`);
    });
    
    console.log('\n🔄 Atualizando para incluir tamanhos...\n');
    
    // Para cada caldo, criar versões 300ml e 180ml
    const batch = db.batch();
    
    for (const doc of caldosSnap.docs) {
      const data = doc.data();
      const nomeBase = data.name.replace(/\s*\(.*\)/, '').trim(); // Remove tamanho se já tiver
      
      // Desativar o item original
      batch.update(doc.ref, { active: false });
      
      // Criar versão 300ml (R$ 15)
      const ref300 = db.collection('cardapio').doc();
      batch.set(ref300, {
        name: `${nomeBase} (300ml)`,
        price: 15.00,
        category: 'caldo',
        active: true,
        order: data.order || 0
      });
      
      // Criar versão 180ml (R$ 10)
      const ref180 = db.collection('cardapio').doc();
      batch.set(ref180, {
        name: `${nomeBase} (180ml)`,
        price: 10.00,
        category: 'caldo',
        active: true,
        order: data.order || 0
      });
      
      console.log(`✅ ${nomeBase}:`);
      console.log(`   - ${nomeBase} (300ml): R$ 15.00`);
      console.log(`   - ${nomeBase} (180ml): R$ 10.00`);
    }
    
    await batch.commit();
    console.log('\n✅ Caldos atualizados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

adicionar();
