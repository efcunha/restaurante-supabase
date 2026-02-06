# Requirements Document

## Introduction

This document specifies the requirements for implementing comprehensive automated tests for the Supabase migration. The system recently migrated from Firebase to Supabase, and critical bugs were discovered in production that should have been caught by tests. These tests will validate schema compliance, field name mappings, query correctness, and RLS policy enforcement to prevent regression and ensure data integrity.

## Glossary

- **Test_System**: The automated testing framework that validates Supabase integration
- **Supabase_Client**: The real Supabase client used to interact with the test database
- **Test_Database**: A dedicated Supabase database instance for running tests
- **Schema_Validator**: Component that validates database schema matches code expectations
- **RLS_Policy**: Row Level Security policy that controls data access in Supabase
- **Service_Under_Test**: The service being tested (PagamentosService, ComandasService, OrderService, CaixaService)
- **Composite_Key**: A primary key composed of multiple fields (e.g., company_id + date_key + comanda_number)
- **Field_Mapping**: The correspondence between code field names and database column names

## Requirements

### Requirement 1: Test Database Configuration

**User Story:** As a developer, I want to use a real Supabase client against a test database, so that tests validate actual database behavior without affecting production data.

#### Acceptance Criteria

1. WHEN tests are executed, THE Test_System SHALL connect to a dedicated test database instance
2. WHEN a test suite starts, THE Test_System SHALL initialize the test database with the required schema
3. WHEN a test completes, THE Test_System SHALL clean up test data to ensure test isolation
4. WHEN tests run in CI/CD, THE Test_System SHALL use environment variables to configure the test database connection
5. THE Test_System SHALL validate that the test database connection is successful before running tests

### Requirement 2: Schema Validation

**User Story:** As a developer, I want to validate that the database schema matches code expectations, so that field type mismatches and missing columns are caught before runtime.

#### Acceptance Criteria

1. WHEN validating schema, THE Schema_Validator SHALL verify that all expected tables exist in the database
2. WHEN validating a table, THE Schema_Validator SHALL verify that all expected columns exist with correct data types
3. WHEN validating constraints, THE Schema_Validator SHALL verify that primary keys, foreign keys, and unique constraints are correctly defined
4. WHEN a schema mismatch is detected, THE Schema_Validator SHALL provide a detailed error message indicating the specific mismatch
5. THE Schema_Validator SHALL validate that enum types match the expected values (e.g., status field values)

### Requirement 3: Field Name Mapping Validation

**User Story:** As a developer, I want to validate that all queries use correct field names, so that field name mismatches (like valor vs amount) are caught before deployment.

#### Acceptance Criteria

1. WHEN testing PagamentosService, THE Test_System SHALL verify that queries use "amount" not "valor" for payment values
2. WHEN testing PagamentosService, THE Test_System SHALL verify that queries use "payment_method" not "forma" for payment methods
3. WHEN testing ComandasService, THE Test_System SHALL verify that queries use "total_consumed" not "totalConsumido"
4. WHEN testing ComandasService, THE Test_System SHALL verify that queries use "total_paid" not "totalPago"
5. WHEN testing OrderService, THE Test_System SHALL verify that queries use "is_paid" not "isPago"
6. WHEN a field name mismatch is detected, THE Test_System SHALL fail the test with a clear error message

### Requirement 4: Composite Key Query Validation

**User Story:** As a developer, I want to validate that composite key queries work correctly, so that queries using single IDs instead of composite keys are caught before production.

#### Acceptance Criteria

1. WHEN querying comandas by composite key, THE Test_System SHALL verify that queries include company_id, date_key, and comanda_number
2. WHEN updating a comanda, THE Test_System SHALL verify that the update uses all three composite key fields
3. WHEN deleting a comanda, THE Test_System SHALL verify that the delete uses all three composite key fields
4. WHEN a composite key query is missing required fields, THE Test_System SHALL fail with an error indicating which fields are missing
5. THE Test_System SHALL validate that composite key queries return the correct record

### Requirement 5: Payment Registration Testing

**User Story:** As a developer, I want to test payment registration with correct field names, so that payment data is stored correctly in Supabase.

#### Acceptance Criteria

1. WHEN registering a payment, THE Test_System SHALL verify that the payment is inserted into the pagamentos table with correct field names
2. WHEN registering a payment, THE Test_System SHALL verify that the comanda's total_paid is updated correctly
3. WHEN registering a payment, THE Test_System SHALL verify that the comanda's open_balance is calculated correctly
4. WHEN registering a payment with invalid data, THE Test_System SHALL verify that appropriate validation errors are thrown
5. WHEN registering a payment, THE Test_System SHALL verify that the cash register is updated with the sale

### Requirement 6: Comanda Management Testing

**User Story:** As a developer, I want to test comanda operations using composite keys, so that comanda queries work correctly in production.

#### Acceptance Criteria

1. WHEN creating a comanda, THE Test_System SHALL verify that the comanda is created with all required composite key fields
2. WHEN querying a comanda by composite key, THE Test_System SHALL verify that the correct comanda is returned
3. WHEN updating a comanda's consumption, THE Test_System SHALL verify that total_consumed and open_balance are updated correctly
4. WHEN closing a comanda, THE Test_System SHALL verify that the status is updated and closing metadata is recorded
5. WHEN listing open comandas, THE Test_System SHALL verify that only comandas with status 'aberta' are returned

### Requirement 7: Order Management Testing

**User Story:** As a developer, I want to test order creation and status updates with valid enum values, so that order state transitions work correctly.

#### Acceptance Criteria

1. WHEN creating an order, THE Test_System SHALL verify that the order is created with valid status enum values
2. WHEN updating order status, THE Test_System SHALL verify that only valid status transitions are allowed
3. WHEN marking an order as paid, THE Test_System SHALL verify that is_paid is set to true
4. WHEN querying orders by comanda, THE Test_System SHALL verify that the correct orders are returned
5. WHEN an invalid status value is used, THE Test_System SHALL verify that the database rejects the operation

### Requirement 8: Cash Register Testing

**User Story:** As a developer, I want to test cash register operations, so that cash register state is managed correctly.

#### Acceptance Criteria

1. WHEN opening a cash register, THE Test_System SHALL verify that the register is created with correct initial values
2. WHEN registering a sale, THE Test_System SHALL verify that sales_by_method is updated correctly for the payment method
3. WHEN registering a reforço, THE Test_System SHALL verify that expected_balance is increased correctly
4. WHEN registering a sangria, THE Test_System SHALL verify that expected_balance is decreased correctly
5. WHEN closing a cash register, THE Test_System SHALL verify that the difference between expected and actual balance is calculated correctly

### Requirement 9: RLS Policy Enforcement Testing

**User Story:** As a developer, I want to test that RLS policies work correctly, so that users can only access data from their own company.

#### Acceptance Criteria

1. WHEN a user queries orders, THE Test_System SHALL verify that only orders from the user's company are returned
2. WHEN a user queries comandas, THE Test_System SHALL verify that only comandas from the user's company are returned
3. WHEN a user attempts to access another company's data, THE Test_System SHALL verify that the query returns no results
4. WHEN a user creates a record, THE Test_System SHALL verify that the company_id is automatically set to the user's company
5. THE Test_System SHALL test RLS policies for all tables: orders, comandas, cash_registers, cash_movements, products, profiles

### Requirement 10: Test Performance and CI/CD Integration

**User Story:** As a developer, I want tests to run fast enough for CI/CD, so that the test suite doesn't slow down the development workflow.

#### Acceptance Criteria

1. WHEN running the full test suite, THE Test_System SHALL complete in under 2 minutes
2. WHEN running tests in CI/CD, THE Test_System SHALL use parallel test execution where possible
3. WHEN tests fail in CI/CD, THE Test_System SHALL provide clear error messages and logs
4. THE Test_System SHALL support running individual test files for faster iteration during development
5. THE Test_System SHALL clean up test data efficiently to minimize test execution time

### Requirement 11: Test Data Management

**User Story:** As a developer, I want test data to be managed consistently, so that tests are reliable and reproducible.

#### Acceptance Criteria

1. WHEN a test starts, THE Test_System SHALL create a fresh test company and user
2. WHEN a test needs sample data, THE Test_System SHALL use factory functions to generate consistent test data
3. WHEN a test completes, THE Test_System SHALL delete all test data created during the test
4. WHEN tests run in parallel, THE Test_System SHALL ensure test data isolation between tests
5. THE Test_System SHALL provide helper functions for common test data setup (e.g., create comanda, create order)

### Requirement 12: Integration Test Coverage

**User Story:** As a developer, I want integration tests that validate end-to-end flows, so that complex interactions between services are tested.

#### Acceptance Criteria

1. WHEN testing payment flow, THE Test_System SHALL validate the complete flow from order creation to payment registration to cash register update
2. WHEN testing comanda flow, THE Test_System SHALL validate the complete flow from comanda creation to consumption tracking to closing
3. WHEN testing order flow, THE Test_System SHALL validate the complete flow from order creation to status updates to delivery
4. WHEN integration tests fail, THE Test_System SHALL provide detailed logs showing which step failed
5. THE Test_System SHALL test error handling in integration flows (e.g., payment with closed cash register)
