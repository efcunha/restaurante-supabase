const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function testarCancelamento() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    // Buscar comandas abertas
    const comandasRef = db.collection('comandas');
    const snapshot = await comandasRef
      .where('dateKey', '==', hoje)
      .where('status', '==', 'aberta')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma comanda aberta encontrada para testar');
      return;
    }
    
    const comanda = snapshot.docs[0];
    const data = comanda.data();
    
    console.log('\n📋 Comanda encontrada:');
    console.log(`   Número: ${data.numeroComanda || data.comandaNumber}`);
    console.log(`   Cliente: ${data.cliente}`);
    console.log(`   Total: R$ ${data.totalConsumido?.toFixed(2) || '0.00'}`);
    console.log(`   Status: ${data.status}`);
    
    console.log('\n✅ Sistema pronto para testar cancelamento!');
    console.log('   1. Abra o app');
    console.log('   2. Vá em Comandas');
    console.log('   3. Selecione a comanda acima');
    console.log('   4. Clique em "CANCELAR COMANDA"');
    console.log('   5. Informe o motivo');
    console.log('   6. Verifique na aba "CANCELADAS"');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

testarCancelamento();
