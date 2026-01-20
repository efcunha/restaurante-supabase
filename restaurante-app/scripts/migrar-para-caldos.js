#!/usr/bin/env node

/**
 * Script de Migração: Espetinhos → Caldos
 * 
 * Este script migra:
 * 1. Cardápio: Remove espetinhos, adiciona caldos
 * 2. Pedidos: Atualiza status e campos de timestamp
 * 3. Funcionários: Atualiza funções
 */

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

// Novos caldos para o cardápio
const CALDOS = [
  { name: 'Caldinho de Macaxeira', price: 15, category: 'caldo', active: true },
  { name: 'Caldo de Fava', price: 18, category: 'caldo', active: true },
  { name: 'Caldo de Camarão', price: 25, category: 'caldo', active: true },
];

async function migrarCardapio() {
  console.log('\n📋 Migrando Cardápio...');
  
  // 1. Deletar espetinhos
  const espetinhosSnapshot = await db.collection('cardapio')
    .where('category', 'in', ['espetinho-simples', 'espetinho-especial'])
    .get();
  
  console.log(`   Encontrados ${espetinhosSnapshot.size} espetinhos para deletar`);
  
  const batch = db.batch();
  espetinhosSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('   ✅ Espetinhos deletados');
  
  // 2. Adicionar caldos
  const batch2 = db.batch();
  CALDOS.forEach(caldo => {
    const ref = db.collection('cardapio').doc();
    batch2.set(ref, caldo);
  });
  await batch2.commit();
  console.log(`   ✅ ${CALDOS.length} caldos adicionados`);
}

async function migrarPedidos() {
  console.log('\n📦 Migrando Pedidos...');
  
  const pedidosSnapshot = await db.collection('pedidos')
    .where('status', '==', 'churrasqueira')
    .get();
  
  console.log(`   Encontrados ${pedidosSnapshot.size} pedidos com status 'churrasqueira'`);
  
  if (pedidosSnapshot.empty) {
    console.log('   ℹ️  Nenhum pedido para migrar');
    return;
  }
  
  const batch = db.batch();
  pedidosSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const updates = {
      status: 'cozinha',
      migrated: true,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Renomear campo de timestamp se existir
    if (data.timeInChurrasqueira) {
      updates.timeInCozinha = data.timeInChurrasqueira;
      updates.timeInChurrasqueira = admin.firestore.FieldValue.delete();
    }
    
    batch.update(doc.ref, updates);
  });
  
  await batch.commit();
  console.log('   ✅ Pedidos migrados');
}

async function migrarFuncionarios() {
  console.log('\n👥 Migrando Funcionários...');
  
  const funcionariosSnapshot = await db.collection('funcionarios')
    .where('funcao', 'in', ['churrasqueiro', 'cozinha'])
    .get();
  
  console.log(`   Encontrados ${funcionariosSnapshot.size} funcionários para migrar`);
  
  if (funcionariosSnapshot.empty) {
    console.log('   ℹ️  Nenhum funcionário para migrar');
    return;
  }
  
  const batch = db.batch();
  funcionariosSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      funcao: 'cozinheiro',
      migrated: true,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log('   ✅ Funcionários migrados');
}

async function verificarMigracao() {
  console.log('\n🔍 Verificando Migração...');
  
  // Verificar caldos
  const caldosSnapshot = await db.collection('cardapio')
    .where('category', '==', 'caldo')
    .get();
  console.log(`   ✅ Caldos no cardápio: ${caldosSnapshot.size}`);
  
  // Verificar espetinhos restantes
  const espetinhosSnapshot = await db.collection('cardapio')
    .where('category', 'in', ['espetinho-simples', 'espetinho-especial'])
    .get();
  console.log(`   ${espetinhosSnapshot.size === 0 ? '✅' : '⚠️'} Espetinhos restantes: ${espetinhosSnapshot.size}`);
  
  // Verificar pedidos
  const pedidosCozinhaSnapshot = await db.collection('pedidos')
    .where('status', '==', 'cozinha')
    .get();
  console.log(`   ✅ Pedidos com status 'cozinha': ${pedidosCozinhaSnapshot.size}`);
  
  const pedidosChurrasqueiraSnapshot = await db.collection('pedidos')
    .where('status', '==', 'churrasqueira')
    .get();
  console.log(`   ${pedidosChurrasqueiraSnapshot.size === 0 ? '✅' : '⚠️'} Pedidos com status 'churrasqueira': ${pedidosChurrasqueiraSnapshot.size}`);
  
  // Verificar funcionários
  const cozinheirosSnapshot = await db.collection('funcionarios')
    .where('funcao', '==', 'cozinheiro')
    .get();
  console.log(`   ✅ Funcionários 'cozinheiro': ${cozinheirosSnapshot.size}`);
}

async function main() {
  console.log('🚀 Iniciando Migração: Espetinhos → Caldos');
  console.log('==========================================');
  
  try {
    await migrarCardapio();
    await migrarPedidos();
    await migrarFuncionarios();
    await verificarMigracao();
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('==========================================\n');
  } catch (error) {
    console.error('\n❌ Erro durante migração:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
