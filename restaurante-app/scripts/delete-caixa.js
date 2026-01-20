const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc } = require('firebase/firestore');

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

const dateKey = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

async function deleteCaixa() {
  try {
    const caixaId = `caixa-${dateKey()}`;
    const caixaRef = doc(db, 'caixas', caixaId);
    
    await deleteDoc(caixaRef);
    console.log(`✅ Caixa ${caixaId} excluído com sucesso!`);
    
    // 🔒 INVALIDAR CACHE DO CAIXASERVICE
    try {
      const CaixaService = require('../src/services/CaixaService');
      if (CaixaService.default && typeof CaixaService.default.invalidateCache === 'function') {
        CaixaService.default.invalidateCache();
        console.log('✅ Cache do CaixaService invalidado');
      }
    } catch (e) {
      console.log('⚠️  Não foi possível invalidar cache (normal em scripts)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao excluir caixa:', error.message);
    process.exit(1);
  }
}

deleteCaixa();
