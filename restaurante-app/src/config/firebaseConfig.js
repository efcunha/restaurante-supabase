import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
    getReactNativePersistence,
    browserLocalPersistence
} from 'firebase/auth';
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);

        // Configuração Diferenciada de Auth (Web vs Native)
        if (Platform.OS === 'web') {
            auth = getAuth(app);
            // Web persistence is handled automatically by default, or explicitly:
            // await setPersistence(auth, browserLocalPersistence);
        } else {
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(AsyncStorage)
            });
        }

        // Configuração do Firestore
        // FIX: Usar memoryLocalCache na Web para evitar erros de BloomFilter/IndexedDB em alguns ambientes
        const cacheConfig = Platform.OS === 'web'
            ? undefined // Default (Memory) for Web
            : persistentLocalCache({ tabManager: persistentMultipleTabManager() });

        db = initializeFirestore(app, {
            localCache: cacheConfig,
            ignoreUndefinedProperties: true
        });

        console.log('✅ Firebase inicializado COM persistência (Offline/Cache)');
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
    }
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}


export { auth, db };
export default app;
