# Implementation Plan: Pizza Management System Enhancement

## Overview

This implementation plan addresses multiple enhancements to the pizza management system:
1. Fix the bug where pizza size variations display incorrectly
2. Add pizza category organization (Tradicional, Especiais, Doces)
3. Implement ingredients management and display
4. Add extras and borders configuration (borda recheada, adicionais)
5. Enhance price display with ranges and size-specific pricing

The implementation is organized into logical phases, with each phase building on the previous one. Testing tasks are marked as optional with "*" to allow for faster MVP delivery.

## Tasks

### Phase 1: Size Variations Bug Fix (Original Feature)

- [x] 1. Add pizza product detection helper function
  - Create `isPizzaProduct` function in GerenciarCardapioScreen.tsx
  - Implement case-insensitive category check for "pizza"
  - _Requirements: 4.1_

- [ ]* 1.1 Write property test for pizza product detection
  - **Property 9: Pizza product detection is case-insensitive**
  - **Validates: Requirements 4.1**

- [x] 2. Implement pizza prices transformation function
  - [x] 2.1 Create `transformPizzaPricesToVariations` function
    - Accept Product parameter with prices field
    - Return array of pseudo-Product objects
    - Map each size name to a variation object
    - _Requirements: 1.1, 5.1_
  
  - [x] 2.2 Implement size sorting logic
    - Define standard size order array
    - Sort sizes: standard order first, then alphabetically
    - Handle case-insensitive matching for standard sizes
    - _Requirements: 5.2_
  
  - [x] 2.3 Add metadata fields to pseudo-Products
    - Add `_isPizzaVariation` flag
    - Add `_originalProductId` reference
    - Add `_sizeName` for save operations
    - Set `name` field to size name
    - Set `price` field to size price
    - _Requirements: 1.1, 2.1_

- [ ]* 2.4 Write property tests for transformation
  - **Property 1: Pizza size names are displayed correctly**
  - **Property 12: Size variations are sorted correctly**
  - **Validates: Requirements 1.1, 5.2**

- [x] 3. Modify abrirVariacoes function for pizza products
  - [x] 3.1 Add pizza product detection at function start
    - Check if first variation is pizza using `isPizzaProduct`
    - Branch logic based on product type
    - _Requirements: 4.2_
  
  - [x] 3.2 Handle pizza products
    - Call `transformPizzaPricesToVariations` for pizza
    - Set `variacoesSelecionadas` with transformed variations
    - Open modal with size variations
    - _Requirements: 1.1, 4.2_
  
  - [x] 3.3 Preserve non-pizza behavior
    - Keep existing logic for non-pizza products
    - Ensure espetinho variations work as before
    - _Requirements: 1.3, 6.1_

- [ ]* 3.4 Write property test for backward compatibility
  - **Property 2: Non-pizza products maintain existing display format**
  - **Validates: Requirements 1.3, 4.3, 6.1**

- [x] 4. Implement pizza variation save function
  - [x] 4.1 Create `savePizzaVariation` async function
    - Accept productId, sizeName, and newPrice parameters
    - Fetch current product from Supabase
    - Extract existing prices Record
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Update prices Record
    - Create updated prices object with new size price
    - Preserve all other size prices unchanged
    - _Requirements: 3.1_
  
  - [x] 4.3 Persist to database
    - Update product with new prices Record
    - Handle Supabase errors
    - Return success/failure status
    - _Requirements: 3.2_

- [ ]* 4.4 Write property tests for save operations
  - **Property 5: Pizza price updates are isolated**
  - **Property 6: Pizza price updates persist to database**
  - **Validates: Requirements 3.1, 3.2**

- [x] 5. Modify salvarVariacao function for pizza products
  - [x] 5.1 Add pizza variation detection
    - Check for `_isPizzaVariation` flag in product parameter
    - Branch logic based on product type
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 Handle pizza variation saves
    - Extract `_originalProductId` and `_sizeName` from pseudo-Product
    - Parse and validate new price string
    - Call `savePizzaVariation` with extracted data
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.3 Update UI state on success
    - Update `variacoesSelecionadas` with new price
    - Call `carregarProdutos` to refresh product list
    - _Requirements: 3.3_
  
  - [x] 5.4 Handle save errors
    - Catch and log errors
    - Display error alert to user
    - Maintain previous price value in UI
    - _Requirements: 3.4_
  
  - [x] 5.5 Preserve non-pizza save behavior
    - Keep existing logic for non-pizza products
    - Update name and price fields directly
    - _Requirements: 6.2_

- [x]* 5.6 Write property tests for UI updates and errors
  - **Property 7: UI reflects saved price changes**
  - **Property 8: Failed updates preserve original prices**
  - **Property 13: Non-pizza save operations are unchanged**
  - **Validates: Requirements 3.3, 3.4, 6.2**

- [x] 6. Checkpoint - Size variations bug fix complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Database Schema for Extras

- [x] 7. Create pizza_extras table in Supabase
  - [x] 7.1 Define table schema
    - Create migration file for pizza_extras table
    - Add columns: id (uuid), company_id (uuid), type (text), name (text), price (numeric), active (boolean), created_at (timestamp), updated_at (timestamp)
    - Add foreign key constraint to companies table
    - Add index on company_id and active
    - _Requirements: 11.6_
  
  - [x] 7.2 Apply migration
    - Run migration in Supabase
    - Verify table creation
    - Test foreign key constraints
    - _Requirements: 11.6_

- [x] 8. Add subcategory field to products table
  - [x] 8.1 Create migration for subcategory field
    - Add subcategory column (text, nullable) to products table
    - Add check constraint for pizza categories (Tradicional, Especiais, Doces)
    - _Requirements: 7.3_
  
  - [x] 8.2 Apply migration
    - Run migration in Supabase
    - Verify column addition
    - Test constraint validation
    - _Requirements: 7.3_

### Phase 3: Product Form Enhancements

- [x] 9. Add category selector to product form
  - [x] 9.1 Create category dropdown component
    - Add dropdown with options: Tradicional, Especiais, Doces
    - Show dropdown only when category is "pizza"
    - Bind to subcategory field
    - _Requirements: 7.1_
  
  - [x] 9.2 Implement category change handler
    - Update product subcategory field on selection
    - Validate category is one of allowed values
    - _Requirements: 7.2, 7.3_

- [ ]* 9.3 Write property tests for category management
  - **Property 14: Pizza category validation**
  - **Property 15: Pizza category storage round-trip**
  - **Validates: Requirements 7.2, 7.3**

- [x] 10. Add ingredients management to product form
  - [x] 10.1 Create ingredients list component
    - Add dynamic list input for ingredients
    - Implement add ingredient button
    - Implement remove ingredient button for each item
    - Show component only when category is "pizza"
    - _Requirements: 8.1_
  
  - [x] 10.2 Implement ingredient handlers
    - `handleIngredientAdd`: Add ingredient to array
    - `handleIngredientRemove`: Remove ingredient at index
    - Validate ingredient is not empty before adding
    - _Requirements: 8.2_
  
  - [x] 10.3 Add custom ingredients text area
    - Add text area for custom ingredient notes
    - Bind to customIngredients field
    - _Requirements: 8.3_
  
  - [x] 10.4 Add ingredient validation
    - Validate at least one ingredient when saving pizza
    - Display error message if validation fails
    - _Requirements: 8.5_

- [ ]* 10.5 Write property tests for ingredients
  - **Property 17: Ingredients storage round-trip**
  - **Property 18: Custom ingredients storage round-trip**
  - **Property 19: Pizza requires at least one ingredient**
  - **Validates: Requirements 8.2, 8.3, 8.5**

- [x] 11. Checkpoint - Product form enhancements complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Admin Screen Ingredients Display

- [x] 12. Update admin product list to display ingredients
  - [x] 12.1 Add ingredients display to product card
    - Format ingredients as comma-separated list
    - Show ingredients below product name
    - _Requirements: 9.1, 9.4_
  
  - [x] 12.2 Implement ingredient truncation
    - Check if ingredients array length > 3
    - Display first 3 ingredients + "..." if more
    - Display all ingredients if 3 or fewer
    - _Requirements: 9.2_
  
  - [x] 12.3 Display custom ingredients
    - Show custom ingredients alongside regular ingredients
    - Format with separator (e.g., " | ")
    - _Requirements: 9.3_

- [ ]* 12.4 Write property tests for admin display
  - **Property 20: Admin screen displays pizza ingredients**
  - **Property 21: Ingredient truncation for long lists**
  - **Property 22: Admin screen displays custom ingredients**
  - **Property 23: Admin ingredients formatted as comma-separated**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Phase 5: Extras Configuration Screen

- [x] 13. Create extras configuration screen
  - [x] 13.1 Create ExtrasConfigScreen component
    - Add navigation route for extras configuration
    - Create screen layout with tabs for Bordas and Adicionais
    - Add "Add New" buttons for each tab
    - _Requirements: 11.1_
  
  - [x] 13.2 Implement extras list display
    - Fetch extras from pizza_extras table filtered by company_id
    - Display bordas in first tab
    - Display adicionais in second tab
    - Show name and price for each extra
    - _Requirements: 11.2, 11.4_
  
  - [x] 13.3 Create add/edit extra modal
    - Add form with fields: name, price, type
    - Implement save handler to insert/update in pizza_extras
    - Validate name is not empty and price is positive
    - _Requirements: 11.2, 11.3, 11.4, 11.5_
  
  - [x] 13.4 Implement delete extra function
    - Add delete button for each extra
    - Show confirmation dialog
    - Soft delete by setting active = false
    - _Requirements: 11.6_

- [ ]* 13.5 Write property tests for extras configuration
  - **Property 27: Extras can be created with names and types**
  - **Property 28: Extra prices can be set and retrieved**
  - **Property 29: Extras persist for order reference**
  - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6**

- [x] 14. Checkpoint - Extras configuration complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: Customer Screen Enhancements

- [x] 15. Implement pizza category grouping in customer screen
  - [x] 15.1 Modify pizza display logic
    - Group pizzas by subcategory field
    - Create sections for Tradicional, Especiais, Doces
    - Create "Outras" section for pizzas without subcategory
    - _Requirements: 7.4, 7.5_
  
  - [x] 15.2 Create category section headers
    - Display category name as section header
    - Style headers distinctly from product cards
    - _Requirements: 7.4_

- [ ]* 15.3 Write property test for category grouping
  - **Property 16: Pizzas are grouped by category**
  - **Validates: Requirements 7.4**

- [x] 16. Add ingredients display to customer pizza cards
  - [x] 16.1 Display all ingredients on pizza card
    - Format ingredients as comma-separated list or bulleted list
    - Show all ingredients from ingredients array
    - _Requirements: 10.1, 10.4_
  
  - [x] 16.2 Display custom ingredients
    - Show custom ingredients as additional information
    - Format with clear separator or label
    - _Requirements: 10.3_

- [ ]* 16.3 Write property tests for customer ingredients display
  - **Property 24: Customer screen displays all ingredients**
  - **Property 25: Customer screen displays custom ingredients**
  - **Property 26: Customer ingredients formatted readably**
  - **Validates: Requirements 10.1, 10.3, 10.4**

- [x] 17. Implement price range display
  - [x] 17.1 Create `formatPriceRange` function
    - Calculate min and max from prices Record
    - Format as "R$[min] - R$[max]"
    - Handle single-size case (display single price)
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 17.2 Display price range on pizza cards
    - Show price range below pizza name
    - Use formatPriceRange function
    - _Requirements: 13.1, 13.2_

- [ ]* 17.3 Write property tests for price range
  - **Property 36: Price range calculated correctly**
  - **Property 37: Price range formatted correctly**
  - **Validates: Requirements 13.1, 13.2**

- [x] 18. Create pizza details modal
  - [x] 18.1 Create PizzaDetailsModal component
    - Display pizza name, image, and full ingredients
    - Show size selection with individual prices
    - Display extras selection sections
    - Show total price calculation
    - Add "Add to Cart" button
    - _Requirements: 13.4_
  
  - [x] 18.2 Implement size selection
    - Display all sizes from prices Record
    - Show size name and individual price for each
    - Allow user to select one size
    - Update base price when size changes
    - _Requirements: 13.4_
  
  - [x] 18.3 Fetch and display extras
    - Fetch active bordas from pizza_extras table
    - Fetch active adicionais from pizza_extras table
    - Display bordas in first section with radio buttons
    - Display adicionais in second section with checkboxes
    - _Requirements: 12.1, 12.2_
  
  - [x] 18.4 Implement extras selection handlers
    - Handle borda selection (single choice)
    - Handle adicionais selection (multiple choice)
    - Store selected extras in state
    - _Requirements: 12.1, 12.2_
  
  - [x] 18.5 Implement price calculation
    - Create `calculatePizzaTotal` function
    - Calculate base price + borda price + sum of adicionais prices
    - Display base price separately
    - Display extras cost separately
    - Display total price
    - _Requirements: 12.3, 12.4, 12.5_
  
  - [x] 18.6 Implement add to cart
    - Create order item with selected size and extras
    - Store sizeName in order item
    - Store selectedExtras array in order item
    - Add to cart state
    - Close modal
    - _Requirements: 12.6_

- [ ]* 18.7 Write property tests for extras and pricing
  - **Property 30: Borda options displayed for pizzas**
  - **Property 31: Adicionais options displayed for pizzas**
  - **Property 32: Borda price added to total**
  - **Property 33: Adicionais prices added to total**
  - **Property 34: Base and extras prices displayed separately**
  - **Property 35: Selected extras stored with order**
  - **Property 38: Size details show individual prices**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.4**

- [x] 19. Checkpoint - Customer screen enhancements complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 7: Integration and Polish

- [x] 20. Update order processing to handle extras
  - [x] 20.1 Modify order item display
    - Show size name for pizza orders
    - Show selected extras with names and prices
    - Calculate correct total including extras
    - _Requirements: 12.6_
  
  - [x] 20.2 Update order persistence
    - Ensure selectedExtras array is saved with order items
    - Ensure sizeName is saved with pizza order items
    - _Requirements: 12.6_

- [x] 21. Add price formatting consistency
  - [x] 21.1 Ensure all prices use toFixed(2)
    - Check all price displays in admin screen
    - Check all price displays in customer screen
    - Check price displays in modals
    - _Requirements: 2.3_

- [ ]* 21.2 Write property test for price formatting
  - **Property 4: Prices are formatted with two decimal places**
  - **Validates: Requirements 2.3**

- [x] 22. Handle edge cases
  - [x] 22.1 Add empty prices field handling
    - Check for undefined or empty prices in transformation
    - Return empty array or show appropriate message
    - _Requirements: 5.3_
  
  - [x] 22.2 Add default price handling
    - Display "0.00" for missing size prices
    - Handle undefined price values gracefully
    - _Requirements: 2.2_
  
  - [x] 22.3 Add default category handling
    - Display uncategorized pizzas in "Outras" section
    - Handle null/undefined subcategory values
    - _Requirements: 7.5_
  
  - [x] 22.4 Add single-size pizza handling
    - Display single price instead of range
    - Handle prices Record with one key
    - _Requirements: 13.3_

- [ ]* 22.5 Write unit tests for edge cases
  - Test empty prices field
  - Test undefined prices field
  - Test missing size in prices Record
  - Test invalid price input
  - Test uncategorized pizzas
  - Test single-size pizzas

- [x] 23. Integration testing
  - [ ]* 23.1 Write integration tests
    - Test full admin workflow: create pizza → set category → add ingredients → set prices → save
    - Test full customer workflow: browse by category → view ingredients → select size → add extras → add to cart
    - Test variations workflow: open modal → edit price → save → verify display
    - Test error recovery: failed save → retry → success

- [x] 24. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation is organized in phases to allow incremental delivery
- Each phase builds on the previous one and can be deployed independently
- Checkpoints ensure validation at key milestones
