# Design Document: Pizza Management System Enhancement

## Overview

This design addresses multiple enhancements to the pizza management system:

1. **Bug Fix**: The "Editar Variações" modal incorrectly displays pizza product names instead of size variation names
2. **Pizza Categories**: Organize pizzas into categories (Tradicional, Especiais, Doces) for better menu organization
3. **Ingredients Management**: Allow administrators to define and display pizza ingredients
4. **Extras and Borders**: Support customizable options like stuffed crust (borda recheada) and additional toppings (adicionais)
5. **Enhanced Pricing Display**: Show price ranges and size-specific pricing to customers

The root cause of the original bug is that the current implementation treats all products uniformly, grouping them by base name. However, pizza products store their size variations in a `prices` Record<string, number> field where keys are size names and values are prices.

The solution involves:
1. Detecting when a product is a pizza (category contains "pizza")
2. Transforming the `prices` field into a format compatible with the existing VariacaoItem component
3. Handling save operations to update the correct price in the `prices` Record
4. Adding support for pizza categories using the `subcategory` field
5. Implementing ingredients management using the existing `ingredients` and `customIngredients` fields
6. Creating a configuration system for extras and borders
7. Enhancing the customer order screen to display ingredients and allow extras selection
8. Maintaining backward compatibility with non-pizza product variations

## Architecture

### Current Architecture

The GerenciarCardapioScreen currently handles product variations by:
- Grouping products by base name (removing content in parentheses)
- Displaying each grouped product as a separate VariacaoItem
- Each VariacaoItem shows the full product name and allows editing name and price
- Save operations update the product's `name` and `price` fields directly

The Product interface already includes:
- `ingredients?: string[]` - Array of ingredient names
- `customIngredients?: string` - Additional ingredient notes
- `prices?: Record<string, number>` - Size variations with prices
- `category: string` - Product category (e.g., "pizza")

### Proposed Architecture

We will extend the existing architecture with:

**1. Pizza-Specific Logic**
- Add pizza product detection based on category
- Transform pizza `prices` Record into pseudo-Product objects for display
- Intercept save operations for pizza variations to update the `prices` Record
- Keep the existing VariacaoItem component interface unchanged

**2. Category Management**
- Use the `subcategory` field to store pizza categories (Tradicional, Especiais, Doces)
- Add category selection in the product form
- Group pizzas by category in the customer order screen

**3. Ingredients Management**
- Use existing `ingredients` array field for ingredient list
- Use existing `customIngredients` field for additional notes
- Add ingredient input interface in the product form
- Display ingredients in both admin and customer screens

**4. Extras Configuration**
- Create a new configuration collection/table for pizza extras
- Store borda recheada options with names and prices
- Store adicionais options with names and prices
- Reference extras in pizza orders

**5. Enhanced Customer Experience**
- Display ingredients with each pizza
- Show price ranges based on available sizes
- Allow selection of extras and borders
- Calculate total price including extras

## Components and Interfaces

### Modified Components

#### 1. GerenciarCardapioScreen

**New State Variables:**
- None required for variations (use existing `variacoesSelecionadas`)
- May need state for extras configuration modal

**Modified Functions:**

**`abrirVariacoes(variacoes: Product[])`**
- Add logic to detect if the first product is a pizza
- If pizza: transform the `prices` Record into pseudo-Product objects
- If not pizza: use existing behavior

**`salvarVariacao(prod: any, novaStr: string, novoNome: string)`**
- Add logic to detect if the product is a pizza
- If pizza: update the specific size price in the `prices` Record
- If not pizza: use existing behavior (update name and price fields)

**New Helper Functions:**

**`isPizzaProduct(product: Product): boolean`**
```typescript
const isPizzaProduct = (product: Product): boolean => {
  return product.category?.toLowerCase().includes('pizza') || false;
};
```

**`transformPizzaPricesToVariations(product: Product): Product[]`**
```typescript
const transformPizzaPricesToVariations = (product: Product): Product[] => {
  if (!product.prices || Object.keys(product.prices).length === 0) {
    return [];
  }
  
  // Define standard size order
  const sizeOrder = ['Fatia', 'Broto', 'Média', 'Médio', 'Grande', 'Família'];
  
  // Sort sizes: standard order first, then alphabetically
  const sortedSizes = Object.keys(product.prices).sort((a, b) => {
    const indexA = sizeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
    const indexB = sizeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
  
  // Create pseudo-Product objects for each size
  return sortedSizes.map(sizeName => ({
    ...product,
    id: `${product.id}_${sizeName}`, // Unique ID for React key
    name: sizeName, // Display the size name instead of product name
    price: product.prices![sizeName],
    _isPizzaVariation: true, // Flag to identify this as a pizza variation
    _originalProductId: product.id, // Reference to original product
    _sizeName: sizeName // Store the size name for save operations
  }));
};
```

**`savePizzaVariation(productId: string, sizeName: string, newPrice: number)`**
```typescript
const savePizzaVariation = async (productId: string, sizeName: string, newPrice: number) => {
  if (!user?.companyId) return;
  
  try {
    // Fetch current product to get existing prices
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('prices')
      .eq('id', productId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Update the specific size price
    const updatedPrices = {
      ...(currentProduct.prices || {}),
      [sizeName]: newPrice
    };
    
    // Save back to database
    const { error: updateError } = await supabase
      .from('products')
      .update({ prices: updatedPrices })
      .eq('id', productId);
    
    if (updateError) throw updateError;
    
    return true;
  } catch (e) {
    console.error('Error saving pizza variation:', e);
    throw e;
  }
};
```

#### 2. Product Form Component (New/Enhanced)

**Purpose**: Create or edit pizza products with full details

**New Fields:**
- **Category Selector**: Dropdown for pizza categories (Tradicional, Especiais, Doces)
- **Ingredients List**: Dynamic list input for adding/removing ingredients
- **Custom Ingredients**: Text area for additional ingredient notes
- **Size Pricing**: Interface for setting prices for each size

**Functions:**

**`handleCategoryChange(category: string)`**
- Update product subcategory field
- Validate category is one of the allowed values

**`handleIngredientAdd(ingredient: string)`**
- Add ingredient to the ingredients array
- Validate ingredient is not empty

**`handleIngredientRemove(index: number)`**
- Remove ingredient at specified index from array

**`handleSizePriceChange(sizeName: string, price: number)`**
- Update the prices Record for the specified size
- Validate price is a positive number

#### 3. Customer Order Screen (Enhanced)

**New Display Components:**

**`PizzaCategorySection`**
- Groups pizzas by subcategory
- Displays category header (Tradicional, Especiais, Doces)
- Lists pizzas within each category

**`PizzaCard`**
- Displays pizza name and image
- Shows ingredients list (formatted)
- Displays price range from prices Record
- Expandable to show size options

**`PizzaDetailsModal`**
- Shows full pizza details
- Size selection with individual prices
- Extras selection (borda recheada, adicionais)
- Calculates total price with extras
- Add to cart button

**Functions:**

**`formatIngredients(ingredients: string[]): string`**
```typescript
const formatIngredients = (ingredients: string[]): string => {
  if (!ingredients || ingredients.length === 0) return '';
  return ingredients.join(', ');
};
```

**`formatPriceRange(prices: Record<string, number>): string`**
```typescript
const formatPriceRange = (prices: Record<string, number>): string => {
  const values = Object.values(prices);
  if (values.length === 0) return 'R$ 0,00';
  if (values.length === 1) return `R$ ${values[0].toFixed(2).replace('.', ',')}`;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `R$ ${min.toFixed(2).replace('.', ',')} - R$ ${max.toFixed(2).replace('.', ',')}`;
};
```

**`calculatePizzaTotal(basePrice: number, selectedExtras: Extra[]): number`**
```typescript
const calculatePizzaTotal = (basePrice: number, selectedExtras: Extra[]): number => {
  const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  return basePrice + extrasTotal;
};
```

#### 4. Extras Configuration Screen (New)

**Purpose**: Configure available extras and borders for pizzas

**State:**
- `bordaOptions: Extra[]` - List of borda recheada options
- `adicionaisOptions: Extra[]` - List of adicionais options

**Functions:**

**`addBordaOption(name: string, price: number)`**
- Add new borda recheada option
- Validate name and price
- Save to configuration

**`addAdicionalOption(name: string, price: number)`**
- Add new adicional option
- Validate name and price
- Save to configuration

**`updateExtraPrice(id: string, newPrice: number)`**
- Update price for existing extra
- Validate price is positive

**`deleteExtra(id: string)`**
- Remove extra from configuration
- Confirm deletion with user

### Data Flow

#### Opening Variations Modal for Pizza

```
User clicks "Editar" on pizza product
  ↓
abrirVariacoes(variacoes) called
  ↓
Check if first product isPizzaProduct()
  ↓
YES: transformPizzaPricesToVariations(product)
  ↓
Set variacoesSelecionadas with pseudo-Product objects
  ↓
Modal displays size names (Fatia, Broto, etc.)
```

#### Saving Pizza Variation

```
User edits price and clicks "Salvar"
  ↓
salvarVariacao(prod, novaStr, novoNome) called
  ↓
Check if prod._isPizzaVariation flag exists
  ↓
YES: Extract _originalProductId and _sizeName
  ↓
Call savePizzaVariation(originalId, sizeName, newPrice)
  ↓
Update prices Record in database
  ↓
Refresh variacoesSelecionadas and product list
```

## Data Models

### Product Interface (Enhanced)

```typescript
interface Product {
  id: string;
  name: string;
  price?: number;
  category: string;
  subcategory?: string; // For pizza categories: "Tradicional", "Especiais", "Doces"
  active: boolean;
  createdAt: number;
  prices?: Record<string, number>; // For pizza sizes: { "Fatia": 29.90, "Broto": 39.90, ... }
  ingredients?: string[]; // For pizzas: ["Molho de tomate artesanal", "Muçarela", ...]
  customIngredients?: string; // Additional ingredient notes
  inventoryItems?: Ingredient[];
  [key: string]: any;
}
```

### Pseudo-Product for Pizza Variations (Runtime Only)

```typescript
interface PizzaVariationProduct extends Product {
  _isPizzaVariation: true;
  _originalProductId: string;
  _sizeName: string;
  // name field contains the size name (e.g., "Fatia")
  // price field contains the price for this size
}
```

### Extra Interface (New)

```typescript
interface Extra {
  id: string;
  companyId: string;
  type: 'borda' | 'adicional'; // Type of extra
  name: string; // e.g., "Catupiry", "Cheddar", "Bacon"
  price: number; // e.g., 7.00 for borda, 5.00 for adicional
  active: boolean;
  createdAt: number;
}
```

### Order Item with Extras (Enhanced)

```typescript
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Base price for selected size
  sizeName?: string; // For pizzas: "Broto", "Média", etc.
  selectedExtras?: SelectedExtra[]; // Extras added to this item
  notes?: string;
}

interface SelectedExtra {
  extraId: string;
  name: string;
  type: 'borda' | 'adicional';
  price: number;
}
```

### Pizza Category Type

```typescript
type PizzaCategory = 'Tradicional' | 'Especiais' | 'Doces' | 'Outras';
```

### Extras Configuration (Database Collection)

**Collection Name**: `pizza_extras`

**Fields**:
- `id`: string (UUID)
- `company_id`: string (foreign key to companies)
- `type`: string ('borda' | 'adicional')
- `name`: string
- `price`: number
- `active`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- 1.2 is redundant with 1.1 (both test size name display)
- 4.3 is redundant with 1.3 (both test non-pizza backward compatibility)
- 6.1 is redundant with 1.3 (both test non-pizza backward compatibility)
- 10.2 is redundant with 10.1 (both test ingredient display)
- 11.4 is redundant with 11.2 (both test extra creation)
- 11.5 is redundant with 11.3 (both test price setting on extras)

The consolidated properties below eliminate these redundancies while maintaining complete coverage.

### Properties

**Size Variations (Original Bug Fix)**

Property 1: Pizza size names are displayed correctly
*For any* pizza product with a non-empty prices field, when the variations modal is opened, all displayed variation names should match the keys from the prices Record
**Validates: Requirements 1.1**

Property 2: Non-pizza products maintain existing display format
*For any* non-pizza product with variations, when the variations modal is opened, the displayed names should match the full product names (existing behavior)
**Validates: Requirements 1.3, 4.3, 6.1**

Property 3: Pizza size prices are displayed correctly
*For any* pizza product size variation, the displayed price should match the value from the prices Record for that size key
**Validates: Requirements 2.1**

Property 4: Prices are formatted with two decimal places
*For any* displayed price value, the string representation should contain exactly two digits after the decimal point
**Validates: Requirements 2.3**

Property 5: Pizza price updates are isolated
*For any* pizza product with multiple sizes, when one size's price is updated, only that specific size's price in the prices Record should change, and all other sizes should remain unchanged
**Validates: Requirements 3.1**

Property 6: Pizza price updates persist to database
*For any* pizza size variation, when the price is updated and saved, querying the database should return the new price value in the prices Record
**Validates: Requirements 3.2**

Property 7: UI reflects saved price changes
*For any* pizza size variation, after a successful price save operation, the displayed price should match the newly saved value
**Validates: Requirements 3.3**

Property 8: Failed updates preserve original prices
*For any* pizza size variation, when a price update fails, the displayed price should remain equal to the value before the update attempt
**Validates: Requirements 3.4**

Property 9: Pizza product detection is case-insensitive
*For any* product, if the category field contains the substring "pizza" (case-insensitive), the product should be identified as a pizza product
**Validates: Requirements 4.1**

Property 10: Pizza products use prices field for variations
*For any* product identified as a pizza product, the variation data should be sourced from the prices Record field, not from grouped product records
**Validates: Requirements 4.2**

Property 11: All prices field sizes are displayed
*For any* pizza product, when the variations modal is opened, the number of displayed variations should equal the number of keys in the prices Record
**Validates: Requirements 5.1**

Property 12: Size variations are sorted correctly
*For any* pizza product, the displayed size variations should be ordered with standard sizes (Fatia, Broto, Médio/Média, Grande, Família) first in that sequence, followed by any additional sizes in alphabetical order
**Validates: Requirements 5.2**

Property 13: Non-pizza save operations are unchanged
*For any* non-pizza product variation, when saved, the database update should modify the product's name and price fields directly (not the prices Record)
**Validates: Requirements 6.2**

**Pizza Categories**

Property 14: Pizza category validation
*For any* pizza product, if a category is assigned, it should be one of the allowed values: "Tradicional", "Especiais", or "Doces"
**Validates: Requirements 7.2**

Property 15: Pizza category storage round-trip
*For any* pizza product, when a category is assigned and saved, querying the product should return the same category value in the subcategory field
**Validates: Requirements 7.3**

Property 16: Pizzas are grouped by category
*For any* collection of pizza products with assigned categories, when displayed on the customer screen, all pizzas with the same category should be grouped together
**Validates: Requirements 7.4**

**Ingredients Management**

Property 17: Ingredients storage round-trip
*For any* pizza product, when ingredients are added and saved, querying the product should return the same ingredients in the ingredients array field
**Validates: Requirements 8.2**

Property 18: Custom ingredients storage round-trip
*For any* pizza product, when custom ingredient notes are entered and saved, querying the product should return the same notes in the customIngredients field
**Validates: Requirements 8.3**

Property 19: Pizza requires at least one ingredient
*For any* pizza product, attempting to save without any ingredients should be rejected by validation
**Validates: Requirements 8.5**

Property 20: Admin screen displays pizza ingredients
*For any* pizza product with ingredients, when displayed in the admin product list, the ingredients should be visible
**Validates: Requirements 9.1**

Property 21: Ingredient truncation for long lists
*For any* pizza product with more than 3 ingredients, when displayed in the admin product list, only the first 3 ingredients should be shown followed by "..."
**Validates: Requirements 9.2**

Property 22: Admin screen displays custom ingredients
*For any* pizza product with custom ingredient notes, when displayed in the admin product list, the custom notes should be visible alongside regular ingredients
**Validates: Requirements 9.3**

Property 23: Admin ingredients formatted as comma-separated
*For any* pizza product with multiple ingredients, when displayed in the admin screen, the ingredients should be joined with commas
**Validates: Requirements 9.4**

Property 24: Customer screen displays all ingredients
*For any* pizza product with ingredients, when displayed on the customer order screen, all ingredients from the ingredients array should be visible
**Validates: Requirements 10.1, 10.2**

Property 25: Customer screen displays custom ingredients
*For any* pizza product with custom ingredient notes, when displayed on the customer order screen, the custom notes should be visible as additional information
**Validates: Requirements 10.3**

Property 26: Customer ingredients formatted readably
*For any* pizza product with multiple ingredients, when displayed on the customer screen, the ingredients should be formatted as a comma-separated or bulleted list
**Validates: Requirements 10.4**

**Extras and Borders**

Property 27: Extras can be created with names and types
*For any* extra (borda or adicional), when created with a name and type, it should be stored and retrievable with the same name and type
**Validates: Requirements 11.2, 11.4**

Property 28: Extra prices can be set and retrieved
*For any* extra, when a price is set and saved, querying the extra should return the same price value
**Validates: Requirements 11.3, 11.5**

Property 29: Extras persist for order reference
*For any* extra, when created and saved, it should be retrievable by its ID for use in pizza orders
**Validates: Requirements 11.6**

Property 30: Borda options displayed for pizzas
*For any* pizza product, when selected on the customer order screen, all active borda recheada options should be displayed
**Validates: Requirements 12.1**

Property 31: Adicionais options displayed for pizzas
*For any* pizza product, when selected on the customer order screen, all active adicionais options should be displayed
**Validates: Requirements 12.2**

Property 32: Borda price added to total
*For any* pizza with a selected borda recheada option, the total price should equal the base pizza price plus the borda price
**Validates: Requirements 12.3**

Property 33: Adicionais prices added to total
*For any* pizza with selected adicionais, the total price should equal the base pizza price plus the sum of all selected adicionais prices
**Validates: Requirements 12.4**

Property 34: Base and extras prices displayed separately
*For any* pizza with selected extras, when displayed on the customer screen, both the base price and the extras cost should be shown as separate values
**Validates: Requirements 12.5**

Property 35: Selected extras stored with order
*For any* pizza added to cart with extras, when the order item is retrieved, it should contain all selected extras with their IDs, names, types, and prices
**Validates: Requirements 12.6**

**Price Display**

Property 36: Price range calculated correctly
*For any* pizza product with multiple sizes, when displayed on the customer screen, the price range should show the minimum and maximum values from the prices Record
**Validates: Requirements 13.1**

Property 37: Price range formatted correctly
*For any* pizza product with multiple sizes, the price range should be formatted as "R$[min] - R$[max]" with proper decimal formatting
**Validates: Requirements 13.2**

Property 38: Size details show individual prices
*For any* pizza product, when details are expanded on the customer screen, each size name should be displayed with its corresponding individual price from the prices Record
**Validates: Requirements 13.4**

## Error Handling

### Error Scenarios

1. **Database Connection Failure**
   - Scenario: Network error when saving pizza variation
   - Handling: Display error alert, maintain current UI state, log error
   - User Action: Retry save operation

2. **Invalid Price Input**
   - Scenario: User enters non-numeric or negative price
   - Handling: Validate input, show validation message, prevent save
   - User Action: Correct input value

3. **Missing Prices Field**
   - Scenario: Pizza product has undefined or null prices field
   - Handling: Treat as empty Record, display "no variations" message
   - User Action: Add prices through full edit modal

4. **Concurrent Modification**
   - Scenario: Another user modifies the same product simultaneously
   - Handling: Last write wins (Supabase default), refresh after save
   - User Action: Review changes, re-edit if needed

### Error Messages

- **Save Failure**: "Erro ao salvar variação" (Error saving variation)
- **Network Error**: "Falha na conexão. Tente novamente." (Connection failed. Try again.)
- **Invalid Input**: "Digite um preço válido" (Enter a valid price)
- **No Variations**: "Nenhuma variação configurada" (No variations configured)

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure correctness:

**Unit Tests** will verify:
- Specific examples of pizza products with known sizes, categories, and ingredients
- Edge cases like empty prices field, single size, missing ingredients, empty extras
- Error conditions like network failures, invalid inputs, validation failures
- Integration between components (modal opening, save operations, extras selection)
- UI rendering with specific data (truncated ingredients, price ranges, category grouping)

**Property-Based Tests** will verify:
- Universal properties across all possible pizza products and configurations
- Comprehensive input coverage through randomization
- Invariants that must hold regardless of specific data values
- Round-trip properties for data persistence

### Property-Based Testing Configuration

We will use **fast-check** (JavaScript/TypeScript property-based testing library) for implementing property tests.

Each property test will:
- Run a minimum of 100 iterations with randomized inputs
- Reference its corresponding design document property
- Use the tag format: **Feature: pizza-size-variations-edit-fix, Property N: [property text]**

### Test Coverage

**Unit Tests:**

*Size Variations (Bug Fix):*
- `isPizzaProduct()` function with various category values
- `transformPizzaPricesToVariations()` with different prices Records
- `savePizzaVariation()` with mock database responses
- Modal opening for pizza vs non-pizza products
- Save operations for pizza vs non-pizza variations
- Error handling for failed saves
- Edge cases: empty prices, undefined prices, single size

*Pizza Categories:*
- Category dropdown with predefined options
- Category validation (only allowed values)
- Category storage and retrieval
- Grouping pizzas by category in customer screen
- Default "Outras" category for uncategorized pizzas

*Ingredients:*
- Adding/removing ingredients in product form
- Ingredient validation (at least one required)
- Ingredients display in admin list (with truncation)
- Ingredients display in customer screen (full list)
- Custom ingredients display in both screens
- Comma-separated formatting

*Extras and Borders:*
- Creating borda recheada options
- Creating adicionais options
- Setting prices on extras
- Displaying extras in customer screen
- Selecting extras and calculating totals
- Storing selected extras with orders

*Price Display:*
- Price range calculation (min/max)
- Price range formatting
- Single price display for one-size pizzas
- Size details with individual prices

**Property Tests:**

*Size Variations (Properties 1-13):*
- Size name display correctness
- Price value display correctness
- Price formatting
- Update isolation
- Persistence verification
- Pizza detection
- Size sorting order
- Backward compatibility

*Pizza Categories (Properties 14-16):*
- Category validation
- Category storage round-trip
- Category grouping

*Ingredients (Properties 17-26):*
- Ingredients storage round-trip
- Custom ingredients storage round-trip
- Ingredient validation
- Display in admin and customer screens
- Truncation logic
- Formatting

*Extras (Properties 27-35):*
- Extra creation and retrieval
- Price setting and retrieval
- Persistence for orders
- Display in customer screen
- Price calculations
- Order storage

*Price Display (Properties 36-38):*
- Price range calculation
- Price range formatting
- Individual price display

**Integration Tests:**
- Full workflow: create pizza → set category → add ingredients → set prices → save
- Customer workflow: browse by category → view ingredients → select size → add extras → add to cart
- Admin workflow: open variations modal → edit price → save → verify display
- Error recovery: failed save → retry → success
- Backward compatibility: non-pizza products work as before

### Test Data Generators

For property-based tests, we will create generators for:
- Random pizza products with varying numbers of sizes, categories, and ingredients
- Random price values (positive numbers with varying decimal places)
- Random size names (standard + custom)
- Random product categories (pizza variants, non-pizza)
- Random prices Records with different key sets
- Random ingredient lists (varying lengths)
- Random pizza categories (Tradicional, Especiais, Doces, Outras)
- Random extras (borda and adicionais) with names and prices
- Random order items with selected extras

### Testing Tools

- **Jest**: Test runner and assertion library
- **React Native Testing Library**: Component testing
- **fast-check**: Property-based testing
- **MSW (Mock Service Worker)**: API mocking for Supabase calls

### Test Organization

Tests will be organized by feature area:
- `pizza-variations.test.ts` - Size variations bug fix tests
- `pizza-categories.test.ts` - Category management tests
- `pizza-ingredients.test.ts` - Ingredients management and display tests
- `pizza-extras.test.ts` - Extras and borders tests
- `pizza-pricing.test.ts` - Price display and calculation tests
- `pizza-integration.test.ts` - End-to-end integration tests
