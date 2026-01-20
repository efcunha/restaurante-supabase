const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function verCanceladas() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    const comandasRef = db.collection('comandas');
    const snapshot = await comandasRef
      .where('dateKey', '==', hoje)
      .where('status', '==', 'cancelada')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma comanda cancelada hoje');
      return;
    }
    
    console.log(`\n📋 ${snapshot.size} comanda(s) cancelada(s) hoje:\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔴 Comanda ${data.numeroComanda || data.comandaNumber}`);
      console.log(`   Cliente: ${data.cliente}`);
      console.log(`   Total: R$ ${data.totalConsumido?.toFixed(2) || '0.00'}`);
      console.log(`   Cancelado por: ${data.canceladaPorNome || 'N/A'}`);
      console.log(`   Motivo: ${data.motivoCancelamento || 'Sem motivo'}`);
      if (data.canceladaEm) {
        const hora = new Date(data.canceladaEm).toLocaleTimeString('pt-BR');
        console.log(`   Cancelada às: ${hora}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

verCanceladas();
