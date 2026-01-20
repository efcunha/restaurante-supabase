#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const CALDOS = [
  { name: 'Caldinho de Macaxeira', price: 15, category: 'caldo', active: true },
  { name: 'Caldo de Fava', price: 18, category: 'caldo', active: true },
  { name: 'Caldo de Camarão', price: 25, category: 'caldo', active: true },
];

const BEBIDAS = [
  { name: 'Refrigerante Lata', price: 7, category: 'bebida', active: true },
  { name: 'Refrigerante 1L', price: 10, category: 'bebida', active: true },
  { name: 'Água Mineral', price: 4, category: 'bebida', active: true },
  { name: 'Água com Gás', price: 4, category: 'bebida', active: true },
  { name: 'Suco', price: 6, category: 'bebida', active: true },
];

const COMIDAS = [
  { name: 'Risoto de Camarão', price: 35, category: 'comida', active: true },
  { name: 'Risoto de Charque', price: 28, category: 'comida', active: true },
  { name: 'Risoto de Frango', price: 25, category: 'comida', active: true },
  { name: 'Risoto de Queijo', price: 22, category: 'comida', active: true },
  { name: 'Batata Frita', price: 15, category: 'comida', active: true },
];

const ADMIN_USER = {
  email: 'admin@restaurante.com',
  nome: 'Administrador',
  funcao: 'admin',
  ativo: true,
  criadoEm: new Date().toISOString()
};

async function main() {
  console.log('🚀 Inicializando Firebase Limpo\n');
  
  // Cardápio
  await db.collection('cardapio').doc('items').set({
    caldos: CALDOS,
    bebidas: BEBIDAS,
    comidas: COMIDAS
  });
  console.log('✅ Cardápio criado');
  
  // Admin
  const existente = await db.collection('funcionarios')
    .where('email', '==', ADMIN_USER.email)
    .get();
  
  if (existente.empty) {
    await db.collection('funcionarios').add(ADMIN_USER);
    console.log('✅ Admin criado');
  } else {
    console.log('ℹ️  Admin já existe');
  }
  
  // Verificar
  const cardapioDoc = await db.collection('cardapio').doc('items').get();
  const cardapio = cardapioDoc.data();
  console.log(`\n📊 Caldos: ${cardapio.caldos.length}`);
  console.log(`📊 Comidas: ${cardapio.comidas.length}`);
  console.log(`📊 Bebidas: ${cardapio.bebidas.length}\n`);
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
