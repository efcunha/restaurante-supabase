#!/usr/bin/env node

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function testarApp() {
  console.log('\n🧪 INICIANDO TESTES DO APP\n');
  
  let sucessos = 0;
  let falhas = 0;

  // Teste 1: Verificar cardápio
  try {
    const cardapioDoc = await db.collection('cardapio').doc('items').get();
    const cardapio = cardapioDoc.data();
    
    if (cardapio.caldos && cardapio.caldos.length >= 3) {
      console.log('✅ Teste 1: Cardápio tem caldos');
      sucessos++;
    } else {
      console.log('❌ Teste 1: Cardápio sem caldos suficientes');
      falhas++;
    }
  } catch (error) {
    console.log('❌ Teste 1: Erro ao buscar cardápio:', error.message);
    falhas++;
  }

  // Teste 2: Verificar bebidas
  try {
    const cardapioDoc = await db.collection('cardapio').doc('items').get();
    const cardapio = cardapioDoc.data();
    
    if (cardapio.bebidas && cardapio.bebidas.length >= 5) {
      console.log('✅ Teste 2: Cardápio tem bebidas');
      sucessos++;
    } else {
      console.log('❌ Teste 2: Cardápio sem bebidas suficientes');
      falhas++;
    }
  } catch (error) {
    console.log('❌ Teste 2: Erro ao buscar bebidas:', error.message);
    falhas++;
  }

  // Teste 3: Verificar comidas
  try {
    const cardapioDoc = await db.collection('cardapio').doc('items').get();
    const cardapio = cardapioDoc.data();
    
    if (cardapio.comidas && cardapio.comidas.length >= 5) {
      console.log('✅ Teste 3: Cardápio tem comidas');
      sucessos++;
    } else {
      console.log('❌ Teste 3: Cardápio sem comidas suficientes');
      falhas++;
    }
  } catch (error) {
    console.log('❌ Teste 3: Erro ao buscar comidas:', error.message);
    falhas++;
  }

  // Teste 4: Criar pedido de teste
  try {
    const pedidoRef = await db.collection('pedidos').add({
      comanda: 999,
      items: [
        { name: 'Caldinho de Macaxeira', quantity: 2, price: 15, category: 'caldo' }
      ],
      status: 'pendente',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      total: 30
    });
    
    console.log('✅ Teste 4: Pedido criado');
    sucessos++;
    
    // Limpar pedido de teste
    await pedidoRef.delete();
  } catch (error) {
    console.log('❌ Teste 4: Erro ao criar pedido:', error.message);
    falhas++;
  }

  // Teste 5: Verificar usuário admin
  try {
    const funcionariosSnap = await db.collection('funcionarios')
      .where('email', '==', 'admin@restaurante.com')
      .get();
    
    if (!funcionariosSnap.empty && funcionariosSnap.docs[0].data().funcao === 'admin') {
      console.log('✅ Teste 5: Usuário admin existe');
      sucessos++;
    } else {
      console.log('❌ Teste 5: Usuário admin não encontrado');
      falhas++;
    }
  } catch (error) {
    console.log('❌ Teste 5: Erro ao buscar admin:', error.message);
    falhas++;
  }

  // Teste 6: Verificar estrutura de caldo
  try {
    const cardapioDoc = await db.collection('cardapio').doc('items').get();
    const caldos = cardapioDoc.data().caldos;
    const caldo = caldos[0];
    
    if (caldo.name && caldo.price && caldo.category === 'caldo' && caldo.active !== undefined) {
      console.log('✅ Teste 6: Estrutura de caldo válida');
      sucessos++;
    } else {
      console.log('❌ Teste 6: Estrutura de caldo inválida');
      falhas++;
    }
  } catch (error) {
    console.log('❌ Teste 6: Erro ao validar estrutura:', error.message);
    falhas++;
  }

  // Resultado final
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTADO: ${sucessos} sucessos, ${falhas} falhas`);
  console.log('='.repeat(50) + '\n');

  if (falhas === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
    process.exit(0);
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM\n');
    process.exit(1);
  }
}

testarApp().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
