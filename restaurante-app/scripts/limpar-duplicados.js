const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function limparDuplicados() {
  try {
    // Deletar o registro antigo (sem UID correto)
    await db.collection('funcionarios').doc('kZUSdlqiV1P0YlvNdde3').delete();
    console.log('✅ Registro duplicado removido');

    // Verificar se o correto existe
    const doc = await db.collection('funcionarios').doc('gCbkH1AakQRgq8QwJCYoNhuQTbp1').get();
    console.log('✅ Registro correto:', doc.exists ? 'EXISTE' : 'NÃO EXISTE');
    
    if (doc.exists) {
      console.log('📋 Dados:', doc.data());
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

limparDuplicados();
