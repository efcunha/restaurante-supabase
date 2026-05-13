module.exports = {
    preset: 'react-native',
    verbose: true,
    setupFiles: ['./jest.setup.js'],
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core|firebase|uuid)'
    ],
    testMatch: [
        '**/__tests__/**/*.test.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)'
    ],
    testPathIgnorePatterns: [
        '/node_modules/', 
        '/android/', 
        '/ios/',
        '/src/__tests__/integration/',
        '/__tests__/helpers/',
        '/__tests__/setup/testHelpers.ts',
        '/__tests__/setup/testFactories.ts',
        '/__tests__/setup/testDatabase.ts',
        '/__tests__/setup/jest.globalSetup.ts',
        '/__tests__/setup/jest.globalTeardown.ts',
        '/__tests__/setup/jest.setup.ts',
        '/balcao\.spec\.ts$',
        '/delivery\.spec\.ts$',
        '/mesa\.spec\.ts$',
        '/pizza\.spec\.ts$'
    ],
    fakeTimers: {
        enableGlobally: true,
    },
};
