# Test Suite Stabilization - Design Document

## Overview

This design document outlines the systematic approach to fixing all 92 failing tests in the test suite. The strategy focuses on identifying root causes, fixing infrastructure issues first, then addressing specific test failures in logical groups.

## Architecture

### Test Failure Categories

```
Test Failures (92 total)
├── Firebase Config Errors (30-40 tests)
│   ├── Missing firebaseConfig.js
│   ├── Firebase imports in migrated code
│   └── Firebase mocks in tests
├── Timeout Issues (20-30 tests)
│   ├── Async operations not awaited
│   ├── Database queries too slow
│   └── Default timeout too short
├── Test Database Issues (15-20 tests)
│   ├── Connection failures
│   ├── Schema mismatches
│   └── Missing environment variables
├── Missing Dependencies (10-15 tests)
│   ├── Module not found errors
│   ├── Expo module mocking
│   └── Test library issues
└── Mock/Stub Issues (10-15 tests)
    ├── Outdated mocks
    ├── Incorrect mock data
    └── Mock setup errors
```

### Fix Strategy Flow

```
1. Infrastructure Setup
   ├── Test database configuration
   ├── Environment variables
   └── Dependencies installation
   
2. Firebase Migration Cleanup
   ├── Remove Firebase test dependencies
   ├── Update Firebase mocks to Supabase
   └── Fix Firebase config references
   
3. Async & Timeout Fixes
   ├── Increase timeout for slow tests
   ├── Fix async/await patterns
   └── Add proper error handling
   
4. Test Data & Mocks
   ├── Fix test data factories
   ├── Update mock configurations
   └── Ensure proper cleanup
   
5. Validation & Documentation
   ├── Run full test suite
   ├── Verify consistency (10 runs)
   └── Document fixes
```

## Components and Interfaces

### 1. Test Failure Analyzer

**Purpose**: Analyze test failures and categorize them by root cause.

**Interface**:
```typescript
interface TestFailureAnalyzer {
  // Analyze test output and categorize failures
  analyzeFailures(testOutput: string): FailureReport;
  
  // Group failures by category
  groupByCategory(failures: TestFailure[]): FailureGroups;
  
  // Identify root causes
  identifyRootCauses(failures: TestFailure[]): RootCause[];
}

interface FailureReport {
  totalFailures: number;
  categories: {
    firebaseConfig: TestFailure[];
    timeout: TestFailure[];
    database: TestFailure[];
    dependencies: TestFailure[];
    mocks: TestFailure[];
  };
  rootCauses: RootCause[];
}

interface TestFailure {
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace: string;
  category: FailureCategory;
}

interface RootCause {
  description: string;
  affectedTests: string[];
  suggestedFix: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}
```

### 2. Test Infrastructure Validator

**Purpose**: Validate that test infrastructure is properly configured.

**Interface**:
```typescript
interface TestInfrastructureValidator {
  // Validate test database connection
  validateDatabase(): Promise<ValidationResult>;
  
  // Validate environment variables
  validateEnvironment(): ValidationResult;
  
  // Validate dependencies
  validateDependencies(): ValidationResult;
  
  // Run all validations
  validateAll(): Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

### 3. Firebase to Supabase Test Migrator

**Purpose**: Migrate Firebase test code to Supabase equivalents.

**Interface**:
```typescript
interface FirebaseTestMigrator {
  // Find all Firebase references in tests
  findFirebaseReferences(testDir: string): FirebaseReference[];
  
  // Replace Firebase imports with Supabase
  replaceImports(testFile: string): void;
  
  // Update Firebase mocks to Supabase mocks
  updateMocks(testFile: string): void;
  
  // Remove Firebase config references
  removeConfigReferences(testFile: string): void;
}

interface FirebaseReference {
  file: string;
  line: number;
  type: 'import' | 'config' | 'mock' | 'usage';
  content: string;
  suggestedReplacement: string;
}
```

### 4. Async Test Fixer

**Purpose**: Fix async/await issues and timeout problems.

**Interface**:
```typescript
interface AsyncTestFixer {
  // Identify missing await statements
  findMissingAwaits(testFile: string): MissingAwait[];
  
  // Identify timeout issues
  findTimeoutIssues(testFile: string): TimeoutIssue[];
  
  // Suggest timeout values
  suggestTimeout(testFile: string): number;
  
  // Fix async patterns
  fixAsyncPatterns(testFile: string): void;
}

interface MissingAwait {
  file: string;
  line: number;
  asyncCall: string;
  suggestedFix: string;
}

interface TimeoutIssue {
  file: string;
  testName: string;
  currentTimeout: number;
  suggestedTimeout: number;
  reason: string;
}
```

### 5. Test Data Manager

**Purpose**: Ensure test data is properly managed and cleaned up.

**Interface**:
```typescript
interface TestDataManager {
  // Validate test data factories
  validateFactories(): ValidationResult;
  
  // Check for data leakage
  checkDataLeakage(): DataLeakageReport;
  
  // Ensure proper cleanup
  ensureCleanup(testFile: string): void;
  
  // Fix factory issues
  fixFactories(): void;
}

interface DataLeakageReport {
  hasLeakage: boolean;
  affectedTests: string[];
  orphanedData: OrphanedData[];
  suggestions: string[];
}

interface OrphanedData {
  table: string;
  recordCount: number;
  testSource: string;
}
```

## Fix Workflow

### Phase 1: Infrastructure Setup (Priority 1)

**Goal**: Ensure test infrastructure is properly configured

**Steps**:
1. Validate test database connection
2. Verify environment variables are set
3. Install missing dependencies
4. Configure Jest properly
5. Set up test database schema

**Success Criteria**:
- Test database accessible
- All environment variables present
- All dependencies installed
- Jest configuration valid

### Phase 2: Firebase Migration Cleanup (Priority 1)

**Goal**: Remove all Firebase dependencies from tests

**Steps**:
1. Identify all Firebase references in test files
2. Remove Firebase imports
3. Remove Firebase config references
4. Update Firebase mocks to Supabase mocks
5. Update test assertions for Supabase data structures

**Success Criteria**:
- No Firebase imports in test files
- No Firebase config references
- All mocks use Supabase
- Tests use Supabase data structures

### Phase 3: Async & Timeout Fixes (Priority 2)

**Goal**: Fix all async/await and timeout issues

**Steps**:
1. Identify tests with timeout issues
2. Increase timeout for slow tests (database operations, integration tests)
3. Find and fix missing await statements
4. Add proper error handling for async operations
5. Fix race conditions

**Success Criteria**:
- No timeout failures
- All async operations properly awaited
- Proper error handling in place
- No race conditions

### Phase 4: Test Data & Mocks (Priority 3)

**Goal**: Ensure test data and mocks are reliable

**Steps**:
1. Review and fix test data factories
2. Update mock configurations
3. Ensure proper test cleanup
4. Fix data leakage issues
5. Validate mock data matches real data

**Success Criteria**:
- Test data factories work reliably
- Mocks return correct data
- No data leakage between tests
- Proper cleanup after each test

### Phase 5: Validation & Documentation (Priority 4)

**Goal**: Verify all tests pass and document the fixes

**Steps**:
1. Run full test suite (should be 100% passing)
2. Run test suite 10 times to check for flaky tests
3. Document all fixes made
4. Update test setup documentation
5. Create test maintenance guidelines

**Success Criteria**:
- 100% test pass rate
- No flaky tests (consistent across 10 runs)
- All fixes documented
- Documentation updated

## Test Categories and Fixes

### Category 1: Firebase Configuration Errors

**Common Errors**:
```
Error: Cannot find module '../config/firebaseConfig'
Error: Firebase not initialized
Error: firebase.firestore is not a function
```

**Fixes**:
1. Remove Firebase imports:
```typescript
// Before
import { firestore } from '../config/firebaseConfig';

// After
import { supabase } from '../config/supabaseClient';
```

2. Update Firebase mocks:
```typescript
// Before
jest.mock('../config/firebaseConfig', () => ({
  firestore: jest.fn()
}));

// After
jest.mock('../config/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: jest.fn()
  }
}));
```

3. Remove Firebase config references:
```typescript
// Before
const db = firebase.firestore();

// After
const { data, error } = await supabase.from('table').select();
```

### Category 2: Timeout Issues

**Common Errors**:
```
Error: Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Fixes**:
1. Increase timeout for database tests:
```typescript
// Before
test('should fetch data', async () => {
  // test code
});

// After
test('should fetch data', async () => {
  // test code
}, 10000); // 10 second timeout for database operations
```

2. Fix missing awaits:
```typescript
// Before
test('should create order', async () => {
  createOrder(data); // Missing await!
  expect(result).toBeDefined();
});

// After
test('should create order', async () => {
  const result = await createOrder(data);
  expect(result).toBeDefined();
});
```

3. Add proper error handling:
```typescript
// Before
test('should handle errors', async () => {
  await riskyOperation();
});

// After
test('should handle errors', async () => {
  try {
    await riskyOperation();
  } catch (error) {
    expect(error).toBeDefined();
  }
});
```

### Category 3: Test Database Issues

**Common Errors**:
```
Error: connect ECONNREFUSED
Error: relation "table_name" does not exist
Error: TEST_SUPABASE_URL is not defined
```

**Fixes**:
1. Ensure environment variables:
```bash
# .env.test
TEST_SUPABASE_URL=your_test_database_url
TEST_SUPABASE_ANON_KEY=your_test_anon_key
TEST_SUPABASE_SERVICE_KEY=your_test_service_key
```

2. Initialize test database:
```typescript
// jest.globalSetup.ts
export default async () => {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );
  
  // Run migrations
  await runMigrations(supabase);
};
```

3. Validate schema before tests:
```typescript
beforeAll(async () => {
  const { data, error } = await supabase
    .from('comandas')
    .select('*')
    .limit(1);
    
  if (error) {
    throw new Error(`Test database not ready: ${error.message}`);
  }
});
```

### Category 4: Missing Dependencies

**Common Errors**:
```
Error: Cannot find module '@react-native-async-storage/async-storage'
Error: Cannot find module 'expo-local-authentication'
```

**Fixes**:
1. Add missing mocks:
```typescript
// jest.setup.js
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn()
}));
```

2. Install missing test dependencies:
```bash
npm install --save-dev @types/jest @testing-library/react-native
```

### Category 5: Mock/Stub Issues

**Common Errors**:
```
Error: Cannot read property 'from' of undefined
Error: Mock function returned undefined
```

**Fixes**:
1. Update mock return values:
```typescript
// Before
jest.mock('../services/OrderService', () => ({
  createOrder: jest.fn()
}));

// After
jest.mock('../services/OrderService', () => ({
  createOrder: jest.fn().mockResolvedValue({
    id: 'test-id',
    status: 'pending',
    items: []
  })
}));
```

2. Fix mock data structure:
```typescript
// Ensure mock data matches real Supabase response
const mockSupabaseResponse = {
  data: [{ id: '1', name: 'Test' }],
  error: null,
  count: 1,
  status: 200,
  statusText: 'OK'
};
```

## Error Handling

### Test Failure Investigation Process

1. **Identify the error message**
2. **Categorize the failure** (Firebase, timeout, database, dependency, mock)
3. **Find the root cause** (not just the symptom)
4. **Apply the appropriate fix**
5. **Verify the fix** (run the test multiple times)
6. **Document the fix** (for future reference)

### Common Pitfalls to Avoid

1. **Don't just increase timeouts blindly** - Fix the underlying async issue
2. **Don't disable failing tests** - Fix them properly
3. **Don't mock everything** - Use real database for integration tests
4. **Don't ignore flaky tests** - They indicate real problems
5. **Don't fix symptoms** - Fix root causes

## Testing Strategy

### Test Execution Plan

1. **Run full test suite** to establish baseline
2. **Fix infrastructure issues** (database, env vars, dependencies)
3. **Fix Firebase migration issues** (bulk fix, affects many tests)
4. **Fix timeout issues** (test by test)
5. **Fix mock issues** (test by test)
6. **Run full test suite again** (should be 100% passing)
7. **Run 10 times** to check for flaky tests
8. **Document all fixes**

### Success Validation

```bash
# Run tests 10 times to check for flaky tests
for i in {1..10}; do
  echo "Run $i"
  npm test
  if [ $? -ne 0 ]; then
    echo "Test run $i failed!"
    exit 1
  fi
done
echo "All 10 runs passed! ✅"
```

## Performance Targets

- **Test execution time**: < 5 minutes for full suite
- **Individual test**: < 10 seconds (except integration tests)
- **Integration test**: < 30 seconds
- **Test suite consistency**: 100% pass rate across 10 runs

## Documentation Requirements

### Test Setup Guide
- Environment variable configuration
- Test database setup
- Dependency installation
- Running tests locally

### Test Maintenance Guide
- How to add new tests
- How to fix failing tests
- How to update mocks
- How to handle test data

### CI/CD Configuration
- GitHub Actions / GitLab CI setup
- Test database configuration in CI
- Environment variable management
- Test result reporting
