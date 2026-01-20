const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function reverter() {
  try {
    // Deletar caldos com tamanho
    const caldosComTamanho = await db.collection('cardapio')
      .where('category', '==', 'caldo')
      .where('active', '==', true)
      .get();
    
    const batch = db.batch();
    caldosComTamanho.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    // Reativar caldos originais
    const caldosInativos = await db.collection('cardapio')
      .where('category', '==', 'caldo')
      .where('active', '==', false)
      .get();
    
    const batch2 = db.batch();
    caldosInativos.forEach(doc => batch2.update(doc.ref, { active: true }));
    await batch2.commit();
    
    console.log('✅ Caldos revertidos para versão original');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

reverter();
