#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function verificarFirebase() {
  console.log('\n🔍 VERIFICANDO ESTRUTURA DO FIREBASE\n');
  
  // Verificar cardápio
  const cardapioDoc = await db.collection('cardapio').doc('items').get();
  console.log('Cardápio existe:', cardapioDoc.exists);
  console.log('Dados do cardápio:', JSON.stringify(cardapioDoc.data(), null, 2));
  
  // Verificar funcionários
  const funcionariosSnap = await db.collection('funcionarios').get();
  console.log('\nFuncionários:', funcionariosSnap.size);
  funcionariosSnap.forEach(doc => {
    console.log('  -', doc.id, ':', doc.data());
  });
  
  process.exit(0);
}

verificarFirebase().catch(console.error);
