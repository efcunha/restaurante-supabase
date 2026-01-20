const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAKu2w_egL1VkGEsRdt6d-574TQiXSk-Aw",
  authDomain: "restaurante-app-d4a5f.firebaseapp.com",
  projectId: "restaurante-app-d4a5f",
  storageBucket: "restaurante-app-d4a5f.firebasestorage.app",
  messagingSenderId: "1069201848319",
  appId: "1:1069201848319:web:e0e1e0c0e0e0e0e0e0e0e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const temperos = [
  { name: 'Cebolinha e Coentro', emoji: '🌿', active: true },
  { name: 'Cebolinha', emoji: '🧅', active: true },
  { name: 'Sem Nada', emoji: '⚪', active: true }
];

async function adicionarTemperos() {
  try {
    console.log('🌿 Adicionando temperos ao Firestore...');
    
    for (const tempero of temperos) {
      await addDoc(collection(db, 'temperos'), tempero);
      console.log(`✅ Adicionado: ${tempero.emoji} ${tempero.name}`);
    }
    
    console.log('\n✅ Todos os temperos foram adicionados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar temperos:', error);
    process.exit(1);
  }
}

adicionarTemperos();
