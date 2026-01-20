/**
 * Script para limpar dados do Firebase Firestore
 * Mantém: funcionarios, estoque, cardapio, produtos
 * Remove: pedidos, comandas, caixa, pagamentos
 * 
 * Uso: node scripts/limpar-firebase.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "restaurante-6f221.firebaseapp.com",
  projectId: "restaurante-6f221",
  storageBucket: "restaurante-6f221.appspot.com",
  messagingSenderId: "XXXXXXXXXX",
  appId: "1:XXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Coleções para LIMPAR (remover todos os documentos)
const COLECOES_PARA_LIMPAR = [
  'pedidos',
  'comandas', 
  'caixa',
  'caixas',
  'movimentosCaixa',
  'pagamentos',
  'historicoVendas',
  'estatisticas'
];

// Coleções para MANTER (não tocar)
const COLECOES_PARA_MANTER = [
  'funcionarios',
  'estoque',
  'cardapio',
  'produtos',
  'categorias',
  'users'
];

async function limparColecao(nomeColecao) {
  console.log(`\n🗑️  Limpando coleção: ${nomeColecao}...`);
  
  try {
    const colRef = collection(db, nomeColecao);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log(`   ✓ Coleção ${nomeColecao} já está vazia`);
      return 0;
    }
    
    const total = snapshot.size;
    console.log(`   Encontrados ${total} documentos para remover`);
    
    // Usar batch para deletar em lotes de 500 (limite do Firestore)
    let deleted = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      batch.delete(doc(db, nomeColecao, docSnapshot.id));
      batchCount++;
      
      // Commit batch a cada 500 documentos
      if (batchCount >= 500) {
        await batch.commit();
        deleted += batchCount;
        console.log(`   Deletados ${deleted}/${total}...`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
    
    // Commit do restante
    if (batchCount > 0) {
      await batch.commit();
      deleted += batchCount;
    }
    
    console.log(`   ✅ Removidos ${deleted} documentos de ${nomeColecao}`);
    return deleted;
    
  } catch (error) {
    console.error(`   ❌ Erro ao limpar ${nomeColecao}:`, error.message);
    return 0;
  }
}

async function listarColecoes() {
  console.log('\n📋 Verificando coleções existentes...\n');
  
  // Tentar listar documentos de cada coleção conhecida
  const todasColecoes = [...COLECOES_PARA_LIMPAR, ...COLECOES_PARA_MANTER];
  
  for (const col of todasColecoes) {
    try {
      const snapshot = await getDocs(collection(db, col));
      const status = COLECOES_PARA_MANTER.includes(col) ? '🔒 MANTER' : '🗑️  LIMPAR';
      console.log(`${status} - ${col}: ${snapshot.size} documentos`);
    } catch (e) {
      console.log(`⚠️  ${col}: não acessível ou vazia`);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     LIMPEZA DO FIREBASE - ESPETO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n⚠️  ATENÇÃO: Este script irá REMOVER dados permanentemente!');
  console.log('\nColeções que serão MANTIDAS:');
  COLECOES_PARA_MANTER.forEach(c => console.log(`   🔒 ${c}`));
  console.log('\nColeções que serão LIMPAS:');
  COLECOES_PARA_LIMPAR.forEach(c => console.log(`   🗑️  ${c}`));
  
  // Listar estado atual
  await listarColecoes();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Iniciando limpeza em 3 segundos... (Ctrl+C para cancelar)');
  console.log('═══════════════════════════════════════════════════════');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  let totalRemovidos = 0;
  
  for (const colecao of COLECOES_PARA_LIMPAR) {
    const removidos = await limparColecao(colecao);
    totalRemovidos += removidos;
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ LIMPEZA CONCLUÍDA! Total de documentos removidos: ${totalRemovidos}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📌 Dados mantidos: funcionarios, estoque, cardapio, produtos');
  console.log('📌 Dados removidos: pedidos, comandas, caixa, caixas, movimentosCaixa, pagamentos\n');
  
  process.exit(0);
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
