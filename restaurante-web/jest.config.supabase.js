/**
 * Jest configuration for Supabase integration tests
 * Uses real Supabase client against test database
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: [
        '**/__tests__/unit/**/*.test.ts',
        '**/__tests__/integration/**/*.test.ts',
        '**/__tests__/schema/**/*.test.ts',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        }],
    },
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
    globalSetup: '<rootDir>/__tests__/setup/jest.globalSetup.ts',
    globalTeardown: '<rootDir>/__tests__/setup/jest.globalTeardown.ts',
    testTimeout: 30000, // 30 seconds for database operations
    maxWorkers: 4, // Parallel execution
    collectCoverageFrom: [
        'src/services/**/*.ts',
        '!src/services/**/*.test.ts',
        '!src/services/**/*.mock.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};
