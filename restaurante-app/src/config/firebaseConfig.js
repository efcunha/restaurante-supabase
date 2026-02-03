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
 * IMPORTANTE: Credenciais são carregadas de variáveis de ambiente
 * para evitar exposição no código fonte.
 * 
 * Variáveis obrigatórias (prefixo EXPO_PUBLIC_):
 * - EXPO_PUBLIC_FIREBASE_API_KEY
 * - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - EXPO_PUBLIC_FIREBASE_PROJECT_ID
 * - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - EXPO_PUBLIC_FIREBASE_APP_ID
 */

// Lista de variáveis obrigatórias
const REQUIRED_ENV_VARS = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
];

/**
 * Valida que todas as variáveis de ambiente obrigatórias estão presentes
 * @throws {Error} Se alguma variável obrigatória estiver ausente
 */
function validateRequiredEnvVars() {
    const missingVars = [];

    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        const errorMessage = [
            '❌ ERRO DE CONFIGURAÇÃO DO FIREBASE',
            '',
            'As seguintes variáveis de ambiente obrigatórias estão ausentes:',
            ...missingVars.map(v => `  - ${v}`),
            '',
            'Para corrigir:',
            '1. Copie o arquivo .env.example para .env',
            '2. Preencha as credenciais do Firebase Console',
            '3. Reinicie o aplicativo',
            '',
            'Documentação: https://firebase.google.com/docs/web/setup'
        ].join('\n');

        throw new Error(errorMessage);
    }
}

/**
 * Valida formato das credenciais
 * @throws {Error} Se alguma credencial tiver formato inválido
 */
function validateCredentialFormats() {
    const errors = [];

    // Valida API Key (deve começar com AIza)
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (apiKey && !apiKey.startsWith('AIza')) {
        errors.push('FIREBASE_API_KEY deve começar com "AIza"');
    }

    // Valida Auth Domain (deve terminar com .firebaseapp.com)
    const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (authDomain && !authDomain.endsWith('.firebaseapp.com')) {
        errors.push('FIREBASE_AUTH_DOMAIN deve terminar com ".firebaseapp.com"');
    }

    // Valida Project ID (deve ser lowercase com hífens)
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId && !/^[a-z0-9-]+$/.test(projectId)) {
        errors.push('FIREBASE_PROJECT_ID deve conter apenas letras minúsculas, números e hífens');
    }

    // Valida Storage Bucket (deve terminar com .appspot.com ou .firebasestorage.app)
    const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (storageBucket && !storageBucket.endsWith('.appspot.com') && !storageBucket.endsWith('.firebasestorage.app')) {
        errors.push('FIREBASE_STORAGE_BUCKET deve terminar com ".appspot.com" ou ".firebasestorage.app"');
    }

    // Valida Messaging Sender ID (deve ser numérico)
    const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    if (messagingSenderId && !/^\d+$/.test(messagingSenderId)) {
        errors.push('FIREBASE_MESSAGING_SENDER_ID deve conter apenas números');
    }

    // Valida App ID (deve começar com 1:)
    const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
    if (appId && !appId.startsWith('1:')) {
        errors.push('FIREBASE_APP_ID deve começar com "1:"');
    }

    if (errors.length > 0) {
        const errorMessage = [
            '❌ ERRO DE FORMATO DAS CREDENCIAIS DO FIREBASE',
            '',
            'As seguintes credenciais têm formato inválido:',
            ...errors.map(e => `  - ${e}`),
            '',
            'Verifique se copiou as credenciais corretamente do Firebase Console.',
            'Documentação: https://firebase.google.com/docs/web/setup'
        ].join('\n');

        throw new Error(errorMessage);
    }
}

// Valida variáveis de ambiente antes de inicializar
try {
    validateRequiredEnvVars();
    validateCredentialFormats();
} catch (error) {
    console.error(error.message);
    // Em desenvolvimento, mostra erro detalhado
    if (__DEV__) {
        throw error;
    }
    // Em produção, falha gracefully
    throw new Error('Erro de configuração do Firebase. Contate o suporte.');
}

// Configuração do Firebase (carregada de variáveis de ambiente)
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

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
        console.log(`🌍 Ambiente: ${__DEV__ ? 'Desenvolvimento' : 'Produção'}`);
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw new Error('Falha ao inicializar Firebase. Verifique as credenciais.');
    }
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}

export { auth, db };
export default app;

/**
 * Retorna informações sobre a configuração atual (sem expor credenciais)
 */
export function getFirebaseInfo() {
    return {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        environment: __DEV__ ? 'development' : 'production',
        platform: Platform.OS
    };
}

/**
 * Valida se o Firebase está configurado corretamente
 */
export function isFirebaseConfigured() {
    try {
        return !!app && !!auth && !!db;
    } catch {
        return false;
    }
}
