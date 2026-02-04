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

/**
 * Configuração do Firebase
 * 
 * IMPORTANTE: Credenciais são carregadas de variáveis de ambiente.
 * O Expo (Metro) substitui `process.env.EXPO_PUBLIC_...` pelo valor literal durante o build.
 * Não devemos iterar sobre `process.env` dinamicamente em produção nativa.
 */

// 1. Definir o objeto de configuração lendo DIRETAMENTE as variáveis
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/**
 * Valida a configuração
 */
function validateConfig() {
    const missingVars = [];
    if (!firebaseConfig.apiKey) missingVars.push('EXPO_PUBLIC_FIREBASE_API_KEY');
    if (!firebaseConfig.authDomain) missingVars.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
    if (!firebaseConfig.projectId) missingVars.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
    if (!firebaseConfig.storageBucket) missingVars.push('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
    if (!firebaseConfig.messagingSenderId) missingVars.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    if (!firebaseConfig.appId) missingVars.push('EXPO_PUBLIC_FIREBASE_APP_ID');

    if (missingVars.length > 0) {
        const errorMsg = `Configuração incompleta. Faltando: ${missingVars.join(', ')}`;
        console.error(errorMsg);
        // Lançar erro para impedir inicialização quebrada
        throw new Error(`Erro de configuração do Firebase: ${missingVars.join(', ')}`);
    }
}

// 2. Validar antes de inicializar
try {
    validateConfig();
} catch (error) {
    console.error('CRITICAL FIREBASE CONFIG ERROR:', error);
    // Em Native, isso pode causar crash se não tratado, mas o ErrorBoundary deve pegar
    if (__DEV__) throw error;
}

// 3. Inicializar App
let app, auth, db;

if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);

        // Configuração Diferenciada de Auth (Web vs Native)
        if (Platform.OS === 'web') {
            auth = getAuth(app);
        } else {
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(AsyncStorage)
            });
        }

        // Configuração do Firestore
        const cacheConfig = Platform.OS === 'web'
            ? undefined // Default (Memory) for Web
            : persistentLocalCache({ tabManager: persistentMultipleTabManager() });

        db = initializeFirestore(app, {
            localCache: cacheConfig,
            ignoreUndefinedProperties: true
        });

        console.log('✅ Firebase inicializado com sucesso');
        console.log(`📦 Projeto: ${firebaseConfig.projectId}`);
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw new Error('Falha ao inicializar Firebase.');
    }
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}

export { auth, db };
export default app;

// Helpers
export function getFirebaseInfo() {
    return {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        environment: __DEV__ ? 'development' : 'production',
        platform: Platform.OS
    };
}

export function isFirebaseConfigured() {
    try {
        validateConfig();
        return !!app && !!auth && !!db;
    } catch {
        return false;
    }
}
