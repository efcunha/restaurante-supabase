# Implementation Plan: Supabase Migration Testing

## Overview

This implementation plan breaks down the creation of comprehensive automated tests for the Supabase migration into discrete, manageable tasks. The approach follows test-driven development principles, implementing test infrastructure first, then schema validation, service tests, and finally integration tests. Each task builds on previous work to ensure incremental progress and early validation.

## Tasks

- [x] 1. Set up test infrastructure and database configuration
  - Create test database configuration module
  - Implement TestDatabaseManager class with connection management
  - Set up environment variable handling for test database credentials
  - Create Jest configuration for Supabase tests
  - Add test database initialization and cleanup scripts
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 1.1 Write property test for test data cleanup
  - **Property 1: Test Data Cleanup Ensures Isolation**
  - **Validates: Requirements 1.3, 11.3**

- [ ] 2. Implement test data factories and helpers
  - [ ] 2.1 Create TestDataFactories class with factory methods
    - Implement createComanda factory
    - Implement createOrder factory
    - Implement createPayment factory
    - Implement createCashRegister factory
    - Implement createProduct factory
    - _Requirements: 11.2, 11.5_
  
  - [ ] 2.2 Create test context management utilities
    - Implement createTestContext helper
    - Implement createTestCompany helper
    - Implement createTestUser helper
    - Add cleanup tracking and execution
    - _Requirements: 11.1, 11.3_
  
  - [ ] 2.3 Write property test for test isolation
    - **Property 23: Test Isolation Prevents Data Interference**
    - **Validates: Requirements 11.4**

- [ ] 3. Checkpoint - Verify test infrastructure works
  - Ensure test database connection succeeds
  - Verify test data factories create valid data
  - Confirm cleanup removes all test data
  - Ask the user if questions arise

- [ ] 4. Implement schema validation system
  - [ ] 4.1 Create SchemaValidator class
    - Implement validateTable method
    - Implement validateAllTables method
    - Implement validateForeignKeys method
    - Implement validateEnumTypes method
    - Add detailed error reporting
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 4.2 Define expected schema definitions
    - Create EXPECTED_SCHEMAS constant with all table schemas
    - Define comandas table schema
    - Define orders table schema
    - Define cash_registers table schema
    - Define cash_movements table schema
    - Define products table schema
    - Define profiles table schema
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 4.3 Write property test for schema validation
    - **Property 2: Schema Validation Detects All Table Mismatches**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ] 4.4 Write property test for enum validation
    - **Property 3: Enum Validation Detects Invalid Values**
    - **Validates: Requirements 2.5, 7.5**
  
  - [ ] 4.5 Write unit tests for schema validator
    - Test schema mismatch error messages
    - Test missing table detection
    - Test missing column detection
    - Test type mismatch detection
    - Test constraint validation
    - _Requirements: 2.4_

- [ ] 5. Implement field name validation system
  - [ ] 5.1 Create FieldNameValidator class
    - Implement validateFieldNames method
    - Implement getFieldMapping method
    - Add field mapping definitions for all tables
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 5.2 Define field name mappings
    - Create FIELD_MAPPINGS constant
    - Define pagamentos field mappings
    - Define comandas field mappings
    - Define orders field mappings
    - Define cash_registers field mappings
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 5.3 Write property test for field name mappings
    - **Property 4: Field Name Mappings Are Correct**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  
  - [ ] 5.4 Write unit tests for field name validator
    - Test field name mismatch detection
    - Test error messages for mismatches
    - _Requirements: 3.6_

- [ ] 6. Checkpoint - Verify validation systems work
  - Run schema validation against test database
  - Verify field name validation catches mismatches
  - Confirm error messages are clear and actionable
  - Ask the user if questions arise

- [x] 7. Implement PagamentosService tests
  - [ ] 7.1 Write unit tests for PagamentosService
    - Test payment registration with valid data
    - Test payment rejection with negative amount
    - Test payment rejection with invalid payment method
    - Test payment rejection with missing required fields
    - Test marcarPedidosComoPagos with valid order IDs
    - _Requirements: 5.1, 5.4_
  
  - [ ] 7.2 Write property test for payment registration updates comanda
    - **Property 6: Payment Registration Updates Comanda Correctly**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ] 7.3 Write property test for payment registration updates cash register
    - **Property 7: Payment Registration Updates Cash Register**
    - **Validates: Requirements 5.5, 8.2**
  
  - [ ] 7.4 Write property test for invalid payment data rejection
    - **Property 8: Invalid Payment Data Is Rejected**
    - **Validates: Requirements 5.4**

- [ ] 8. Implement ComandasService tests
  - [ ] 8.1 Write unit tests for ComandasService
    - Test comanda creation with valid data
    - Test comanda query by composite key
    - Test comanda update with consumption
    - Test comanda closing
    - Test listing open comandas
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 8.2 Write property test for composite key operations
    - **Property 5: Composite Key Operations Use All Required Fields**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
  
  - [ ] 8.3 Write property test for comanda creation with composite key
    - **Property 9: Comanda Creation Includes Composite Key**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ] 8.4 Write property test for comanda consumption updates
    - **Property 10: Comanda Consumption Updates Balance**
    - **Validates: Requirements 6.3**
  
  - [ ] 8.5 Write property test for comanda closing
    - **Property 11: Comanda Closing Updates Status and Metadata**
    - **Validates: Requirements 6.4**
  
  - [ ] 8.6 Write property test for listing open comandas
    - **Property 12: List Open Comandas Filters By Status**
    - **Validates: Requirements 6.5**
  
  - [ ] 8.7 Write unit tests for composite key error handling
    - Test error when composite key is incomplete
    - Test error message indicates missing fields
    - _Requirements: 4.4_

- [ ] 9. Implement OrderService tests
  - [ ] 9.1 Write unit tests for OrderService
    - Test order creation with valid status
    - Test order status updates
    - Test marking order as paid
    - Test querying orders by comanda
    - Test invalid status rejection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 9.2 Write property test for order creation with valid status
    - **Property 13: Order Creation Uses Valid Status**
    - **Validates: Requirements 7.1**
  
  - [ ] 9.3 Write property test for order status transitions
    - **Property 14: Order Status Transitions Are Valid**
    - **Validates: Requirements 7.2**
  
  - [ ] 9.4 Write property test for marking order as paid
    - **Property 15: Marking Order As Paid Sets Flag**
    - **Validates: Requirements 7.3**
  
  - [ ] 9.5 Write property test for order queries by comanda
    - **Property 16: Order Queries Filter By Comanda**
    - **Validates: Requirements 7.4**

- [ ] 10. Checkpoint - Verify service tests work
  - Run all service tests and verify they pass
  - Check test coverage for service methods
  - Verify property tests run 100+ iterations
  - Ask the user if questions arise

- [ ] 11. Implement CaixaService tests
  - [ ] 11.1 Write unit tests for CaixaService
    - Test cash register opening
    - Test sale registration
    - Test reforço registration
    - Test sangria registration
    - Test cash register closing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 11.2 Write property test for cash register opening
    - **Property 17: Cash Register Opening Sets Initial Balance**
    - **Validates: Requirements 8.1**
  
  - [ ] 11.3 Write property test for reforço
    - **Property 18: Reforço Increases Expected Balance**
    - **Validates: Requirements 8.3**
  
  - [ ] 11.4 Write property test for sangria
    - **Property 19: Sangria Decreases Expected Balance**
    - **Validates: Requirements 8.4**
  
  - [ ] 11.5 Write property test for cash register closing
    - **Property 20: Cash Register Closing Calculates Difference**
    - **Validates: Requirements 8.5**

- [ ] 12. Implement RLS policy tests
  - [ ] 12.1 Create RLSPolicyTester class
    - Implement testCompanyIsolation method
    - Implement testCreatePermission method
    - Implement testUpdatePermission method
    - Implement testCrossCompanyAccess method
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 12.2 Write RLS policy tests for all tables
    - Test RLS for orders table
    - Test RLS for comandas table
    - Test RLS for cash_registers table
    - Test RLS for cash_movements table
    - Test RLS for products table
    - Test RLS for profiles table
    - _Requirements: 9.5_
  
  - [ ] 12.3 Write property test for RLS company isolation
    - **Property 21: RLS Policies Enforce Company Isolation**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  
  - [ ] 12.4 Write property test for record creation sets company ID
    - **Property 22: Record Creation Sets Company ID**
    - **Validates: Requirements 9.4**

- [ ] 13. Implement integration tests
  - [ ] 13.1 Write payment flow integration test
    - Test complete flow: open cash register → create comanda → add consumption → register payment
    - Verify all systems updated correctly
    - Test error handling (e.g., payment with closed cash register)
    - _Requirements: 12.1, 12.5_
  
  - [ ] 13.2 Write comanda flow integration test
    - Test complete flow: create comanda → add consumption → register payments → close comanda
    - Verify state transitions work correctly
    - Test error handling (e.g., closing comanda with open balance)
    - _Requirements: 12.2, 12.5_
  
  - [ ] 13.3 Write order flow integration test
    - Test complete flow: create order → update status → mark as paid → deliver
    - Verify status transitions work correctly
    - Test error handling (e.g., invalid status transitions)
    - _Requirements: 12.3, 12.5_
  
  - [ ] 13.4 Write unit tests for integration test error reporting
    - Test that failed integration tests show which step failed
    - Verify error logs are detailed and actionable
    - _Requirements: 12.4_

- [ ] 14. Set up CI/CD integration
  - [ ] 14.1 Configure Jest for CI/CD
    - Add parallel test execution configuration
    - Configure test timeouts
    - Set up coverage reporting
    - _Requirements: 10.2, 10.3_
  
  - [ ] 14.2 Create CI/CD workflow file
    - Add test database setup step
    - Add test execution step with parallel workers
    - Add coverage upload step
    - Add test result reporting
    - _Requirements: 10.2, 10.3_
  
  - [ ] 14.3 Write unit tests for CI/CD configuration
    - Test that parallel execution is enabled
    - Test that individual test files can be run
    - Verify error messages are clear in CI logs
    - _Requirements: 10.2, 10.3, 10.4_

- [ ] 15. Final checkpoint - Run full test suite
  - Run all tests locally and verify they pass
  - Run tests in CI/CD and verify they pass
  - Check test execution time is under 2 minutes
  - Verify test coverage meets requirements
  - Ensure all tests are properly tagged with property references
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows across services
- All tests use real Supabase client against test database (no mocks)
- Test data is isolated using unique company IDs for parallel execution
- Cleanup is automatic after each test to ensure test isolation
