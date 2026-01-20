const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const CARDAPIO = [
  // Caldos
  { name: 'Caldinho de Macaxeira', price: 15, category: 'caldo', active: true },
  { name: 'Caldo de Fava', price: 18, category: 'caldo', active: true },
  { name: 'Caldo de Camarão', price: 25, category: 'caldo', active: true },
  
  // Bebidas
  { name: 'Refrigerante Lata', price: 7, category: 'bebida', active: true },
  { name: 'Refrigerante 1L', price: 10, category: 'bebida', active: true },
  { name: 'Água Mineral', price: 4, category: 'bebida', active: true },
  { name: 'Água com Gás', price: 4, category: 'bebida', active: true },
  { name: 'Suco', price: 6, category: 'bebida', active: true },
];

async function adicionarCardapio() {
  try {
    console.log('📝 Adicionando itens ao cardápio...\n');
    
    const batch = db.batch();
    let count = 0;
    
    for (const item of CARDAPIO) {
      const docRef = db.collection('cardapio').doc();
      batch.set(docRef, item);
      console.log(`   ✓ ${item.name} - R$ ${item.price} (${item.category})`);
      count++;
    }
    
    await batch.commit();
    
    console.log(`\n✅ ${count} itens adicionados com sucesso!`);
    console.log('\n💡 Execute: node verificar-cardapio.js para confirmar');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

adicionarCardapio();
