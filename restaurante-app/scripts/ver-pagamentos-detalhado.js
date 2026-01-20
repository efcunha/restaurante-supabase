const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function ver() {
  try {
    const pagamentosSnap = await db.collection('pagamentos').get();
    
    console.log(`💰 ${pagamentosSnap.size} pagamento(s) total:\n`);
    
    pagamentosSnap.forEach(doc => {
      const data = doc.data();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎫 Comanda:', data.comandaNumber);
      console.log('📅 dateKey:', data.dateKey);
      console.log('💳 Forma:', data.forma);
      console.log('💵 Valor: R$', data.valor?.toFixed(2));
      console.log('👤 Recebido por:', data.usuarioNome);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

ver();
