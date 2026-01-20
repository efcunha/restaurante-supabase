import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const temperos = [
  { name: 'Cebolinha e Coentro', emoji: '🌿', color: '#FF9800', active: true, order: 1 },
  { name: 'Cebolinha', emoji: '🧅', color: '#4CAF50', active: true, order: 2 },
  { name: 'Sem Nada', emoji: '⚪', color: '#999', active: true, order: 3 }
];

export async function adicionarTemperos() {
  try {
    console.log('🌿 Adicionando temperos...');
    
    for (const tempero of temperos) {
      const docRef = await addDoc(collection(db, 'temperos'), tempero);
      console.log(`✅ ${tempero.emoji} ${tempero.name} - ID: ${docRef.id}`);
    }
    
    console.log('\n✅ Temperos adicionados!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}
