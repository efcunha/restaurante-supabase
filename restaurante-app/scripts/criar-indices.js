const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

console.log('📋 ÍNDICES NECESSÁRIOS NO FIRESTORE\n');
console.log('Acesse o Firebase Console e crie os seguintes índices:\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1️⃣ COLEÇÃO: orders');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Índice composto para queries de pedidos:');
console.log('  - dateKey (Ascending)');
console.log('  - createdAt (Descending)');
console.log('\nÍndice para unicidade de comanda por dia:');
console.log('  - dateKey (Ascending)');
console.log('  - comandaNumber (Ascending)');
console.log('\nÍndice para buscar por status:');
console.log('  - dateKey (Ascending)');
console.log('  - status (Ascending)');
console.log('  - createdAt (Descending)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2️⃣ COLEÇÃO: funcionarios');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Campo único: uid (já é o ID do documento)');
console.log('Campo único: email');
console.log('\n⚠️ Para garantir unicidade de email, use Security Rules:');
console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /funcionarios/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == uid 
        && !exists(/databases/$(database)/documents/funcionarios/$(uid));
      allow update: if request.auth.uid == uid;
    }
  }
}
`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3️⃣ COLEÇÃO: cardapio');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Índice para buscar por categoria:');
console.log('  - category (Ascending)');
console.log('  - active (Ascending)');
console.log('\nÍndice para buscar ativos:');
console.log('  - active (Ascending)');
console.log('  - name (Ascending)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4️⃣ COLEÇÃO: temperos');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Índice para ordenar:');
console.log('  - active (Ascending)');
console.log('  - order (Ascending)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('5️⃣ COLEÇÃO: comandas');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Índice para unicidade de comanda por dia:');
console.log('  - dateKey (Ascending)');
console.log('  - comandaNumber (Ascending)');
console.log('\nÍndice para buscar comandas abertas:');
console.log('  - dateKey (Ascending)');
console.log('  - status (Ascending)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 COMO CRIAR OS ÍNDICES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Acesse: https://console.firebase.google.com');
console.log('2. Selecione seu projeto');
console.log('3. Vá em Firestore Database > Indexes');
console.log('4. Clique em "Create Index"');
console.log('5. Adicione os campos conforme listado acima');
console.log('6. Aguarde a criação (pode levar alguns minutos)');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔒 VALIDAÇÃO DE UNICIDADE DE COMANDA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function verificarDuplicatas() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const comandasRef = db.collection('comandas');
    const snapshot = await comandasRef.where('dateKey', '==', hoje).get();
    
    const comandasMap = new Map();
    const duplicatas = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const numero = data.comandaNumber;
      
      if (comandasMap.has(numero)) {
        duplicatas.push({
          numero,
          docs: [comandasMap.get(numero), doc.id]
        });
      } else {
        comandasMap.set(numero, doc.id);
      }
    });
    
    if (duplicatas.length > 0) {
      console.log('\n⚠️ DUPLICATAS ENCONTRADAS:');
      duplicatas.forEach(dup => {
        console.log(`  Comanda ${dup.numero}: ${dup.docs.join(', ')}`);
      });
    } else {
      console.log('\n✅ Nenhuma duplicata encontrada hoje');
      console.log(`📊 Total de comandas hoje: ${comandasMap.size}`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas:', error.message);
  }
}

verificarDuplicatas().then(() => process.exit(0));
