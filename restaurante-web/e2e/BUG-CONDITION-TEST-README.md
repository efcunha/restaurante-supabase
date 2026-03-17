# Bug Condition Exploration Test

## Overview

This document describes the bug condition exploration test for the cross-marking issue in delivery orders.

## Test File

`e2e/bug-condition-exploration.spec.ts`

## Bug Description

**Bug**: When clicking an item in one delivery order to mark it as "ready", the system incorrectly marks the item in a different delivery order instead.

**Affected Scenario**: Multiple delivery orders with items of the same name (e.g., "Caldo 300ml")

## Test Strategy

The test uses a property-based testing approach to explore the bug systematically:

1. **Setup**: Creates 3 delivery orders, each with the same item ("Caldo 300ml")
2. **Property**: For each order index (0, 1, 2), clicks the item in that order
3. **Verification**: Asserts that only the clicked order's item is marked (not items in other orders)

## Expected Behavior

**CRITICAL**: This test is **EXPECTED TO FAIL** on unfixed code. The failure confirms the bug exists.

### On Unfixed Code (Current State)
- Test will FAIL
- Clicking item in order N will mark item in a different order (e.g., order M where M ≠ N)
- This demonstrates the bug exists

### On Fixed Code (After Implementation)
- Test will PASS
- Clicking item in order N will mark only that order's item
- This confirms the fix works correctly

## How to Run

```bash
# Run the bug condition exploration test
npx playwright test e2e/bug-condition-exploration.spec.ts

# Run with UI mode for debugging
npx playwright test e2e/bug-condition-exploration.spec.ts --ui

# Run a specific test case (e.g., order 1)
npx playwright test e2e/bug-condition-exploration.spec.ts -g "order 1"
```

## Test Requirements Validation

**Validates: Requirements 1.1, 1.2, 1.3**

- **1.1**: Tests that clicking an item in the first delivery card marks only that card
- **1.2**: Tests with 3 delivery orders with the same item, verifying correct order is marked
- **1.3**: Tests that `handleToggleItem` marks the correct order when receiving compound IDs

## Counterexamples to Document

When the test fails (on unfixed code), it will reveal counterexamples such as:

- "Clicking item in order 0 marks it in order 1 instead"
- "Clicking item in order 1 marks it in order 2 instead"
- "Clicking item in order 2 marks it in order 0 instead"

These counterexamples help understand the root cause of the bug.

## Root Cause Analysis

Based on the code review, the bug likely occurs in the `handleToggleItem` function in `MontagemScreen.tsx`:

1. The function receives compound IDs in format `orderId::itemId`
2. It extracts the real order ID and item ID
3. **Bug**: When finding the order in `allOrders`, it may be finding the wrong order due to:
   - Incorrect order lookup logic
   - Race conditions in state updates
   - Issues with compound ID parsing

## Next Steps

1. ✅ **Task 1**: Write bug condition exploration test (COMPLETE)
2. **Task 2**: Implement fix for the cross-marking bug
3. **Task 3**: Verify test passes after fix
4. **Task 4**: Add regression tests to prevent future occurrences
