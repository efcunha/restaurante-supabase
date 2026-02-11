// Load test environment variables
require('dotenv').config({ path: '.env.test' });

import 'react-native-gesture-handler/jestSetup';

// Mock Supabase config to use test client
jest.mock('./src/config/SupabaseConfig', () => {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.TEST_SUPABASE_ANON_KEY || 
                        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    return {
        supabase: createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        }),
    };
});

jest.mock('@react-native-community/netinfo', () => ({
    configure: jest.fn(),
    fetch: jest.fn(),
    addEventListener: jest.fn(),
    useNetInfo: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-local-authentication', () => ({
    authenticateAsync: jest.fn(),
    hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
    isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
    supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
    getEnrolledLevelAsync: jest.fn(() => Promise.resolve(1)),
    AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
    },
}));

jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(() => Promise.resolve()),
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random()),
    getRandomBytes: jest.fn((size) => new Uint8Array(size)),
    getRandomBytesAsync: jest.fn((size) => {
        // Generate random bytes for backup code generation
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
        return Promise.resolve(bytes);
    }),
    digestStringAsync: jest.fn((algorithm, data) => Promise.resolve('hashed-' + data)),
}));

jest.mock('expo-modules-core', () => {
    const EventEmitter = require('events');
    return {
        EventEmitter: EventEmitter,
        NativeModulesProxy: {},
        requireNativeModule: jest.fn(),
        requireOptionalNativeModule: jest.fn(),
        requireNativeViewManager: jest.fn(),
    };
});

jest.mock('expo-haptics', () => ({
    notificationAsync: jest.fn(),
    impactAsync: jest.fn(),
    NotificationFeedbackType: {
        Success: 'success',
        Warning: 'warning',
        Error: 'error',
    },
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
}));

jest.mock('expo-constants', () => ({
    manifest: {
        extra: {
            supabaseUrl: 'https://test.supabase.co',
            supabaseAnonKey: 'test-key',
        },
    },
}));

// Mock lz-string for cache compression tests
jest.mock('lz-string', () => ({
    compress: jest.fn((str) => `compressed:${str}`),
    decompress: jest.fn((str) => str.replace('compressed:', '')),
    compressToUTF16: jest.fn((str) => `compressed:${str}`),
    decompressFromUTF16: jest.fn((str) => str.replace('compressed:', '')),
}));
