/**
 * Jest Configuration for Performance Optimization Tests
 * 
 * This configuration is specifically for testing performance optimization services
 * including property-based tests using fast-check.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

module.exports = {
  preset: 'react-native',
  displayName: 'performance-optimization',
  testMatch: [
    '**/__tests__/performance/**/*.test.ts',
    '**/__tests__/property/**/*.test.ts',
  ],
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core|@supabase)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/optimization/**/*.ts',
    '!src/services/optimization/**/*.d.ts',
    '!src/services/optimization/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
  // Property-based testing configuration
  testTimeout: 30000, // 30 seconds for property tests
  maxWorkers: '50%', // Use half of available CPU cores
};
