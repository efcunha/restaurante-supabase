const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function ver() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    console.log('📅 Data:', hoje);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Comandas
    const comandasSnap = await db.collection('comandas')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`🎫 ${comandasSnap.size} COMANDA(S):\n`);
    comandasSnap.forEach(doc => {
      const c = doc.data();
      console.log(`Comanda ${c.comandaNumber || c.numeroComanda}:`);
      console.log(`  Total Consumido: R$ ${(c.totalConsumido || 0).toFixed(2)}`);
      console.log(`  Total Pago: R$ ${(c.totalPago || 0).toFixed(2)}`);
      console.log(`  Saldo: R$ ${(c.saldoAberto || 0).toFixed(2)}`);
      console.log(`  Status: ${c.status}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Pedidos
    const pedidosSnap = await db.collection('orders')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`📦 ${pedidosSnap.size} PEDIDO(S):\n`);
    pedidosSnap.forEach(doc => {
      const p = doc.data();
      console.log(`Pedido ${p.idFormatado || doc.id}:`);
      console.log(`  Comanda: ${p.comandaNumber || p.numeroComanda}`);
      console.log(`  Total: R$ ${(p.totalPrice || 0).toFixed(2)}`);
      console.log(`  Itens: ${p.items?.length || 0}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Pagamentos
    const pagamentosSnap = await db.collection('pagamentos')
      .where('dateKey', '==', hoje)
      .get();
    
    console.log(`💰 ${pagamentosSnap.size} PAGAMENTO(S):\n`);
    pagamentosSnap.forEach(doc => {
      const p = doc.data();
      console.log(`Comanda ${p.comandaNumber}:`);
      console.log(`  💳 ${p.forma.toUpperCase()}: R$ ${(p.valor || 0).toFixed(2)}`);
      console.log(`  Recebido por: ${p.usuarioNome}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

ver();
