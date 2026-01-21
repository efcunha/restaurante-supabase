import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // Auth Persistence with AsyncStorage (keeps user logged in across restarts)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  // Firestore Persistence (Offline Capabilities)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  
  console.log('✅ Firebase inicializado COM persistência (Offline/Cache)');
} catch (error) {
  // If already initialized, ignore
  if (!/already exists/.test(error.message)) {
      console.error('❌ Erro ao inicializar Firebase:', error);
  }
}

export { auth, db };
export default app;
