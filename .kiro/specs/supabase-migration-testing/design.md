# Design Document: Supabase Migration Testing

## Overview

This design document outlines the architecture and implementation approach for comprehensive automated tests for the Supabase migration. The testing system will validate schema compliance, field name mappings, composite key queries, and RLS policy enforcement using real Supabase clients against a dedicated test database.

The testing approach follows a dual strategy:
- **Unit tests**: Validate specific service methods, edge cases, and error conditions
- **Property-based tests**: Validate universal properties across all inputs
- **Integration tests**: Validate end-to-end flows across multiple services

## Architecture

### Test Environment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Environment                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────────────────────┐    │
│  │  Jest Test   │─────▶│  Supabase Test Client        │    │
│  │  Runner      │      │  (Real Client, Not Mocked)   │    │
│  └──────────────┘      └──────────────┬───────────────┘    │
│                                        │                     │
│                                        ▼                     │
│                        ┌──────────────────────────────┐    │
│                        │  Test Database Instance      │    │
│                        │  (Isolated from Production)  │    │
│                        └──────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Test Organization Structure

```
__tests__/
├── setup/
│   ├── testDatabase.ts          # Test DB connection & setup
│   ├── testHelpers.ts            # Common test utilities
│   └── testFactories.ts          # Test data factories
├── unit/
│   ├── services/
│   │   ├── PagamentosService.test.ts
│   │   ├── ComandasService.test.ts
│   │   ├── OrderService.test.ts
│   │   └── CaixaService.test.ts
│   └── validators/
│       └── SchemaValidator.test.ts
├── integration/
│   ├── PaymentFlow.test.ts
│   ├── ComandaFlow.test.ts
│   └── OrderFlow.test.ts
└── schema/
    ├── SchemaValidation.test.ts
    └── RLSPolicies.test.ts
```

## Components and Interfaces

### 1. Test Database Manager

**Purpose**: Manages test database connection, initialization, and cleanup.

**Interface**:
```typescript
interface TestDatabaseManager {
  // Initialize test database connection
  initialize(): Promise<void>;
  
  // Create a test company and return its ID
  createTestCompany(): Promise<string>;
  
  // Create a test user for a company
  createTestUser(companyId: string, role: string): Promise<TestUser>;
  
  // Clean up all test data
  cleanup(): Promise<void>;
  
  // Clean up data for specific company
  cleanupCompany(companyId: string): Promise<void>;
  
  // Get Supabase client configured for testing
  getClient(): SupabaseClient;
}

interface TestUser {
  id: string;
  email: string;
  companyId: string;
  role: string;
  authToken: string;
}
```

**Implementation Notes**:
- Uses environment variables for test database URL and credentials
- Creates a dedicated Supabase client instance for tests
- Implements efficient cleanup using database transactions
- Supports parallel test execution with isolated test companies

### 2. Schema Validator

**Purpose**: Validates that database schema matches code expectations.

**Interface**:
```typescript
interface SchemaValidator {
  // Validate that a table exists with expected structure
  validateTable(tableName: string, expectedSchema: TableSchema): Promise<ValidationResult>;
  
  // Validate all tables in the system
  validateAllTables(): Promise<ValidationResult[]>;
  
  // Validate foreign key constraints
  validateForeignKeys(tableName: string): Promise<ValidationResult>;
  
  // Validate enum types
  validateEnumTypes(tableName: string, columnName: string, expectedValues: string[]): Promise<ValidationResult>;
}

interface TableSchema {
  tableName: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
  uniqueConstraints: string[][];
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
}

interface ForeignKeyDefinition {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

**Implementation Notes**:
- Queries Supabase information_schema to get actual schema
- Compares actual schema against expected schema definitions
- Provides detailed error messages for mismatches
- Can be run as part of test suite or standalone validation

### 3. Test Data Factories

**Purpose**: Generate consistent test data for services.

**Interface**:
```typescript
interface TestDataFactories {
  // Create a test comanda
  createComanda(companyId: string, overrides?: Partial<Comanda>): Promise<Comanda>;
  
  // Create a test order
  createOrder(companyId: string, comandaNumber: string, overrides?: Partial<Order>): Promise<Order>;
  
  // Create a test payment
  createPayment(companyId: string, comandaNumber: string, overrides?: Partial<Payment>): Promise<Payment>;
  
  // Create a test cash register
  createCashRegister(companyId: string, overrides?: Partial<CashRegister>): Promise<CashRegister>;
  
  // Create a test product
  createProduct(companyId: string, overrides?: Partial<Product>): Promise<Product>;
}
```

**Implementation Notes**:
- Uses sensible defaults for all fields
- Allows overriding specific fields for test scenarios
- Ensures all required relationships are created (e.g., company, user)
- Returns fully populated objects matching database records

### 4. Field Name Validator

**Purpose**: Validates that queries use correct Supabase field names.

**Interface**:
```typescript
interface FieldNameValidator {
  // Validate field names in a query result
  validateFieldNames(tableName: string, result: any): ValidationResult;
  
  // Get expected field name mapping for a table
  getFieldMapping(tableName: string): FieldMapping;
}

interface FieldMapping {
  tableName: string;
  mappings: {
    codeField: string;
    dbColumn: string;
  }[];
}
```

**Implementation Notes**:
- Maintains a mapping of code field names to database column names
- Validates that query results use correct field names
- Provides clear error messages when field names don't match
- Can be extended to validate field names in query parameters

### 5. RLS Policy Tester

**Purpose**: Tests Row Level Security policy enforcement.

**Interface**:
```typescript
interface RLSPolicyTester {
  // Test that user can only access their company's data
  testCompanyIsolation(tableName: string, user1: TestUser, user2: TestUser): Promise<ValidationResult>;
  
  // Test that user can create records in their company
  testCreatePermission(tableName: string, user: TestUser): Promise<ValidationResult>;
  
  // Test that user can update records in their company
  testUpdatePermission(tableName: string, user: TestUser): Promise<ValidationResult>;
  
  // Test that user cannot access other company's data
  testCrossCompanyAccess(tableName: string, user: TestUser, otherCompanyId: string): Promise<ValidationResult>;
}
```

**Implementation Notes**:
- Creates test users in different companies
- Attempts to access data across company boundaries
- Validates that RLS policies correctly restrict access
- Tests all CRUD operations for each table

## Data Models

### Test Configuration

```typescript
interface TestConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  testDatabaseUrl: string;
  parallelTests: boolean;
  cleanupAfterTests: boolean;
}
```

### Test Context

```typescript
interface TestContext {
  companyId: string;
  user: TestUser;
  client: SupabaseClient;
  cleanup: () => Promise<void>;
}
```

### Expected Schema Definitions

```typescript
const EXPECTED_SCHEMAS = {
  comandas: {
    tableName: 'comandas',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'company_id', type: 'uuid', nullable: false },
      { name: 'comanda_number', type: 'integer', nullable: false },
      { name: 'date_key', type: 'date', nullable: false },
      { name: 'status', type: 'text', nullable: false },
      { name: 'table_number', type: 'integer', nullable: true },
      { name: 'client_name', type: 'text', nullable: true },
      { name: 'total_consumed', type: 'numeric', nullable: false },
      { name: 'total_paid', type: 'numeric', nullable: false },
      { name: 'open_balance', type: 'numeric', nullable: false },
      { name: 'received_by', type: 'jsonb', nullable: false },
      { name: 'opened_at', type: 'timestamptz', nullable: false },
      { name: 'opened_by', type: 'uuid', nullable: true },
      { name: 'opened_by_name', type: 'text', nullable: true },
      { name: 'closed_at', type: 'timestamptz', nullable: true },
      { name: 'closed_by', type: 'uuid', nullable: true },
      { name: 'closed_by_name', type: 'text', nullable: true },
      { name: 'canceled_at', type: 'timestamptz', nullable: true },
      { name: 'canceled_by', type: 'uuid', nullable: true },
      { name: 'canceled_by_name', type: 'text', nullable: true },
      { name: 'cancel_reason', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false }
    ],
    primaryKey: ['id'],
    foreignKeys: [
      { column: 'company_id', referencedTable: 'companies', referencedColumn: 'id' },
      { column: 'opened_by', referencedTable: 'profiles', referencedColumn: 'id' },
      { column: 'closed_by', referencedTable: 'profiles', referencedColumn: 'id' },
      { column: 'canceled_by', referencedTable: 'profiles', referencedColumn: 'id' }
    ],
    uniqueConstraints: [['company_id', 'comanda_number', 'date_key']]
  },
  
  orders: {
    tableName: 'orders',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'company_id', type: 'uuid', nullable: false },
      { name: 'comanda_number', type: 'integer', nullable: true },
      { name: 'table_number', type: 'integer', nullable: true },
      { name: 'client_name', type: 'text', nullable: true },
      { name: 'observations', type: 'text', nullable: true },
      { name: 'status', type: 'text', nullable: false },
      { name: 'total_amount', type: 'numeric', nullable: false },
      { name: 'items', type: 'jsonb', nullable: false },
      { name: 'is_paid', type: 'boolean', nullable: false },
      { name: 'payment_method', type: 'text', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
      { name: 'date_key', type: 'date', nullable: false }
    ],
    primaryKey: ['id'],
    foreignKeys: [
      { column: 'company_id', referencedTable: 'companies', referencedColumn: 'id' },
      { column: 'created_by', referencedTable: 'profiles', referencedColumn: 'id' }
    ],
    uniqueConstraints: []
  },
  
  cash_registers: {
    tableName: 'cash_registers',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'company_id', type: 'uuid', nullable: false },
      { name: 'opened_by', type: 'uuid', nullable: true },
      { name: 'opened_by_name', type: 'text', nullable: true },
      { name: 'opened_at', type: 'timestamptz', nullable: false },
      { name: 'closed_by', type: 'uuid', nullable: true },
      { name: 'closed_by_name', type: 'text', nullable: true },
      { name: 'closed_at', type: 'timestamptz', nullable: true },
      { name: 'status', type: 'text', nullable: false },
      { name: 'initial_value', type: 'numeric', nullable: false },
      { name: 'expected_balance', type: 'numeric', nullable: false },
      { name: 'actual_balance', type: 'numeric', nullable: true },
      { name: 'difference', type: 'numeric', nullable: true },
      { name: 'sales_by_method', type: 'jsonb', nullable: false },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'date_key', type: 'date', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false }
    ],
    primaryKey: ['id'],
    foreignKeys: [
      { column: 'company_id', referencedTable: 'companies', referencedColumn: 'id' },
      { column: 'opened_by', referencedTable: 'profiles', referencedColumn: 'id' },
      { column: 'closed_by', referencedTable: 'profiles', referencedColumn: 'id' }
    ],
    uniqueConstraints: []
  }
};
```

### Field Name Mappings

```typescript
const FIELD_MAPPINGS = {
  pagamentos: {
    valor: 'amount',
    forma: 'payment_method',
    comandaNumber: 'comanda_number',
    dateKey: 'date_key',
    usuarioId: 'received_by',
    usuarioNome: 'received_by_name'
  },
  
  comandas: {
    totalConsumido: 'total_consumed',
    totalPago: 'total_paid',
    saldoAberto: 'open_balance',
    recebidoPor: 'received_by',
    abertaAt: 'opened_at',
    abertaPor: 'opened_by',
    abertaPorNome: 'opened_by_name',
    fechadaAt: 'closed_at',
    fechadaPor: 'closed_by',
    fechadaPorNome: 'closed_by_name',
    canceladaEm: 'canceled_at',
    canceladaPor: 'canceled_by',
    canceladaPorNome: 'canceled_by_name',
    motivoCancelamento: 'cancel_reason'
  },
  
  orders: {
    isPago: 'is_paid',
    formaPagamento: 'payment_method',
    totalPrice: 'total_amount',
    comandaNumber: 'comanda_number',
    dateKey: 'date_key',
    criadoPor: 'created_by',
    criadoPorNome: 'created_by_name'
  },
  
  cash_registers: {
    valorInicial: 'initial_value',
    saldoEsperado: 'expected_balance',
    saldoReal: 'actual_balance',
    diferenca: 'difference',
    porForma: 'sales_by_method',
    abertoPor: 'opened_by',
    abertoPorNome: 'opened_by_name',
    abertoAt: 'opened_at',
    fechadoPor: 'closed_by',
    fechadoPorNome: 'closed_by_name',
    fechadoAt: 'closed_at'
  }
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Test Data Cleanup Ensures Isolation

*For any* test execution, after the test completes and cleanup runs, no test data created during that test should remain in the database.

**Validates: Requirements 1.3, 11.3**

### Property 2: Schema Validation Detects All Table Mismatches

*For any* table in the expected schema definitions, the Schema_Validator should verify that the table exists in the database with all expected columns, types, and constraints.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Enum Validation Detects Invalid Values

*For any* field with enum constraints (e.g., status fields), the Schema_Validator should verify that only the expected enum values are allowed, and invalid values are rejected by the database.

**Validates: Requirements 2.5, 7.5**

### Property 4: Field Name Mappings Are Correct

*For any* service query result, all field names should match the expected Supabase column names according to the field mapping definitions, not the old Firebase field names.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 5: Composite Key Operations Use All Required Fields

*For any* operation on the comandas table (query, update, delete), the operation should include all three composite key fields: company_id, date_key, and comanda_number.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 6: Payment Registration Updates Comanda Correctly

*For any* payment of amount X registered to a comanda, the comanda's total_paid should increase by X, and the open_balance should equal total_consumed minus total_paid.

**Validates: Requirements 5.2, 5.3**

### Property 7: Payment Registration Updates Cash Register

*For any* payment of amount X with payment method M, the cash register's sales_by_method[M] should increase by X, and the expected_balance should increase by X.

**Validates: Requirements 5.5, 8.2**

### Property 8: Invalid Payment Data Is Rejected

*For any* payment with invalid data (negative amount, invalid payment method, missing required fields), the system should throw an appropriate validation error and not modify the database.

**Validates: Requirements 5.4**

### Property 9: Comanda Creation Includes Composite Key

*For any* comanda created, it should have all three composite key fields populated: company_id, date_key, and comanda_number, and querying by these fields should return the same comanda.

**Validates: Requirements 6.1, 6.2**

### Property 10: Comanda Consumption Updates Balance

*For any* consumption of amount X added to a comanda, the total_consumed should increase by X, and the open_balance should equal total_consumed minus total_paid.

**Validates: Requirements 6.3**

### Property 11: Comanda Closing Updates Status and Metadata

*For any* open comanda, closing it should set the status to 'fechada', record the closing timestamp, and record who closed it.

**Validates: Requirements 6.4**

### Property 12: List Open Comandas Filters By Status

*For any* set of comandas with mixed statuses, listing open comandas should return only those with status 'aberta'.

**Validates: Requirements 6.5**

### Property 13: Order Creation Uses Valid Status

*For any* order created, its status should be one of the valid enum values: 'pending', 'preparing', 'ready', 'delivered', or 'cancelled'.

**Validates: Requirements 7.1**

### Property 14: Order Status Transitions Are Valid

*For any* order status update, the transition should follow valid state machine rules (e.g., cannot go from 'delivered' back to 'pending').

**Validates: Requirements 7.2**

### Property 15: Marking Order As Paid Sets Flag

*For any* order marked as paid, the is_paid field should be set to true.

**Validates: Requirements 7.3**

### Property 16: Order Queries Filter By Comanda

*For any* comanda number, querying orders for that comanda should return only orders with matching comanda_number.

**Validates: Requirements 7.4**

### Property 17: Cash Register Opening Sets Initial Balance

*For any* cash register opened with initial value X, the expected_balance should be set to X.

**Validates: Requirements 8.1**

### Property 18: Reforço Increases Expected Balance

*For any* reforço (cash addition) of amount X, the cash register's expected_balance should increase by X.

**Validates: Requirements 8.3**

### Property 19: Sangria Decreases Expected Balance

*For any* sangria (cash removal) of amount X, the cash register's expected_balance should decrease by X.

**Validates: Requirements 8.4**

### Property 20: Cash Register Closing Calculates Difference

*For any* cash register closed with actual balance Y and expected balance X, the difference should equal Y minus X.

**Validates: Requirements 8.5**

### Property 21: RLS Policies Enforce Company Isolation

*For any* user querying any table (orders, comandas, cash_registers, etc.), the results should only include records where company_id matches the user's company, and attempts to access other companies' data should return empty results.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 22: Record Creation Sets Company ID

*For any* user creating a record in any table, the company_id should be automatically set to the user's company_id.

**Validates: Requirements 9.4**

### Property 23: Test Isolation Prevents Data Interference

*For any* two tests running in parallel, the test data created by one test should not be visible to or affect the other test.

**Validates: Requirements 11.4**

## Error Handling

### Database Connection Errors

- **Scenario**: Test database is unavailable or connection fails
- **Handling**: Tests should fail fast with clear error message indicating connection issue
- **Recovery**: Provide instructions for setting up test database

### Schema Validation Errors

- **Scenario**: Database schema doesn't match expected schema
- **Handling**: Schema validator should provide detailed diff showing what's missing or incorrect
- **Recovery**: Provide migration script or instructions to fix schema

### RLS Policy Errors

- **Scenario**: RLS policies are not configured correctly
- **Handling**: RLS tests should fail with clear message indicating which policy is missing or incorrect
- **Recovery**: Provide SQL script to create or fix RLS policies

### Test Data Cleanup Errors

- **Scenario**: Cleanup fails due to foreign key constraints or other issues
- **Handling**: Log detailed error and attempt to clean up in correct order (respecting foreign keys)
- **Recovery**: Provide manual cleanup script if automatic cleanup fails

### Composite Key Errors

- **Scenario**: Query uses incomplete composite key
- **Handling**: Test should fail with message indicating which key fields are missing
- **Recovery**: Update query to include all required composite key fields

### Field Name Errors

- **Scenario**: Query uses old Firebase field names instead of Supabase column names
- **Handling**: Test should fail with message showing expected vs actual field names
- **Recovery**: Update service code to use correct Supabase field names

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

- **Unit tests**: Validate specific examples, edge cases, error conditions, and integration points
- **Property-based tests**: Verify universal properties across all inputs through randomization

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: fast-check (for TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `Feature: supabase-migration-testing, Property {number}: {property_text}`

**Example**:
```typescript
// Feature: supabase-migration-testing, Property 6: Payment Registration Updates Comanda Correctly
test('payment registration updates comanda correctly', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 1, max: 10000 }), // payment amount
      async (amount) => {
        const { comanda, cleanup } = await createTestComanda();
        const initialPaid = comanda.total_paid;
        const initialBalance = comanda.open_balance;
        
        await PagamentosService.registrarPagamento({
          companyId: comanda.company_id,
          dateKey: comanda.date_key,
          comandaNumber: comanda.comanda_number,
          forma: 'dinheiro',
          valor: amount,
          usuarioId: 'test-user',
          usuarioNome: 'Test User'
        });
        
        const updated = await getComanda(comanda.company_id, comanda.date_key, comanda.comanda_number);
        
        expect(updated.total_paid).toBe(initialPaid + amount);
        expect(updated.open_balance).toBe(updated.total_consumed - updated.total_paid);
        
        await cleanup();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Focus Areas**:
1. **Specific Examples**: Test concrete scenarios with known inputs and outputs
2. **Edge Cases**: Test boundary conditions (empty strings, zero amounts, null values)
3. **Error Conditions**: Test invalid inputs and verify appropriate errors
4. **Integration Points**: Test interactions between services

**Example**:
```typescript
describe('PagamentosService', () => {
  test('should reject negative payment amount', async () => {
    await expect(
      PagamentosService.registrarPagamento({
        companyId: 'test-company',
        dateKey: '2024-01-01',
        comandaNumber: '1',
        forma: 'dinheiro',
        valor: -10,
        usuarioId: 'test-user',
        usuarioNome: 'Test User'
      })
    ).rejects.toThrow('Valor inválido');
  });
  
  test('should reject invalid payment method', async () => {
    await expect(
      PagamentosService.registrarPagamento({
        companyId: 'test-company',
        dateKey: '2024-01-01',
        comandaNumber: '1',
        forma: 'invalid-method',
        valor: 10,
        usuarioId: 'test-user',
        usuarioNome: 'Test User'
      })
    ).rejects.toThrow('Forma de pagamento inválida');
  });
});
```

### Integration Testing Strategy

**Focus Areas**:
1. **End-to-End Flows**: Test complete workflows across multiple services
2. **Service Interactions**: Verify services work together correctly
3. **Error Propagation**: Test that errors are handled correctly across service boundaries

**Example Integration Test**:
```typescript
describe('Payment Flow Integration', () => {
  test('complete payment flow updates all systems', async () => {
    const { company, user, cleanup } = await createTestContext();
    
    // 1. Open cash register
    await CaixaService.abrirCaixa(company.id, 100, user.id, user.name);
    
    // 2. Create comanda
    const comanda = await ComandasService.ensureComandaAberta(
      company.id, '1', user.id, user.name
    );
    
    // 3. Add consumption
    await ComandasService.adicionarConsumo(company.id, '1', 50);
    
    // 4. Register payment
    await PagamentosService.registrarPagamento({
      companyId: company.id,
      dateKey: comanda.dateKey,
      comandaNumber: '1',
      forma: 'dinheiro',
      valor: 50,
      usuarioId: user.id,
      usuarioNome: user.name
    });
    
    // 5. Verify comanda updated
    const updatedComanda = await getComanda(company.id, comanda.dateKey, '1');
    expect(updatedComanda.total_paid).toBe(50);
    expect(updatedComanda.open_balance).toBe(0);
    
    // 6. Verify cash register updated
    const cashRegister = await CaixaService.getCaixaAberto(company.id);
    expect(cashRegister.sales_by_method.dinheiro).toBeGreaterThan(0);
    
    await cleanup();
  });
});
```

### Test Organization

**Directory Structure**:
```
__tests__/
├── setup/
│   ├── testDatabase.ts          # Database setup and teardown
│   ├── testHelpers.ts            # Common utilities
│   └── testFactories.ts          # Data factories
├── unit/
│   ├── services/                 # Service unit tests
│   └── validators/               # Validator unit tests
├── integration/                  # Integration tests
├── schema/                       # Schema validation tests
└── properties/                   # Property-based tests
```

### Test Execution

**Local Development**:
```bash
# Run all tests
npm test

# Run specific test file
npm test -- PagamentosService.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

**CI/CD**:
```bash
# Run tests with parallel execution
npm test -- --maxWorkers=4

# Run with coverage and upload to codecov
npm test -- --coverage && codecov
```

### Performance Targets

- Full test suite: < 2 minutes
- Individual test file: < 10 seconds
- Property-based test: < 5 seconds (100 iterations)
- Integration test: < 15 seconds

### Test Data Management

**Setup**:
- Each test creates a fresh test company and user
- Test data is isolated using unique company IDs
- Factory functions provide consistent test data

**Cleanup**:
- Automatic cleanup after each test
- Cleanup respects foreign key constraints
- Manual cleanup script available for emergencies

**Isolation**:
- Parallel tests use different company IDs
- No shared state between tests
- Each test is independent and can run in any order
