import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Preferir variáveis de ambiente (Expo: usar prefixo EXPO_PUBLIC_*)
// NÃO são segredos sensíveis, mas evitamos hardcode e logs em produção.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCCQ1MCRyNt7wriW3o50WYp53kjdst0nFw",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "restaurante-dabf3.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "restaurante-dabf3",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "restaurante-dabf3.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1043883310626",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1043883310626:web:52b52446afc4832553147b",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-LQX6VLVF3P"
};

let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase inicializado sem cache');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
}

export { auth, db };
export default app;
