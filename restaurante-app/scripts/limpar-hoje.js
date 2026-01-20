const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function limpar() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    console.log('🗑️  Limpando dados de:', hoje);
    console.log('');
    
    // Limpar comandas
    const comandasSnap = await db.collection('comandas')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`🎫 Deletando ${comandasSnap.size} comanda(s)...`);
    const batch1 = db.batch();
    comandasSnap.forEach(doc => batch1.delete(doc.ref));
    await batch1.commit();
    
    // Limpar pedidos (orders)
    const ordersSnap = await db.collection('orders')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`📦 Deletando ${ordersSnap.size} pedido(s) em orders...`);
    const batch2 = db.batch();
    ordersSnap.forEach(doc => batch2.delete(doc.ref));
    await batch2.commit();
    
    // Limpar pedidos antigos (pedidos)
    const pedidosSnap = await db.collection('pedidos')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`📦 Deletando ${pedidosSnap.size} pedido(s) em pedidos...`);
    const batch3 = db.batch();
    pedidosSnap.forEach(doc => batch3.delete(doc.ref));
    await batch3.commit();
    
    // Limpar pagamentos
    const pagamentosSnap = await db.collection('pagamentos')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`💰 Deletando ${pagamentosSnap.size} pagamento(s)...`);
    const batch4 = db.batch();
    pagamentosSnap.forEach(doc => batch4.delete(doc.ref));
    await batch4.commit();
    
    // Limpar contador de comandas
    const contadorRef = db.collection('counters').doc(`comandas-${hoje}`);
    console.log(`🔢 Deletando contador de comandas...`);
    await contadorRef.delete();
    
    console.log('');
    console.log('✅ Limpeza concluída! Pronto para começar do zero.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

limpar();
