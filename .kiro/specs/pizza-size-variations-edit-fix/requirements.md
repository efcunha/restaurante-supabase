# Requirements Document

## Introduction

This document specifies the requirements for enhancing the pizza management system in the admin menu management screen. The system needs to:

1. Fix the existing bug where pizza size variations display the product name instead of size names (fatia, broto, médio, grande/família)
2. Add support for pizza categories (Tradicional, Especiais, Doces) to organize pizzas
3. Add support for extras and borders (borda recheada, adicionais) with configurable pricing
4. Display pizza ingredients in both admin and customer screens

These enhancements will enable administrators to properly manage a complete pizza menu with categories, ingredients, size variations, and optional extras.

## Glossary

- **Admin_Menu_Screen**: The "Gerenciar Cardápio" (Manage Menu) administrative interface where products are managed
- **Customer_Order_Screen**: The "Novo Pedido" (New Order) interface where customers select products
- **Variations_Modal**: The "Editar Variações" (Edit Variations) modal dialog that appears when editing products with multiple variations
- **Pizza_Product**: A product with category "pizza" that has multiple size variations stored in the `prices` field
- **Size_Variation**: A specific pizza size (fatia, broto, médio, grande/família) with its associated price
- **Prices_Field**: The `prices` Record<string, number> field in the Product interface that stores size names as keys and prices as values
- **VariacaoItem_Component**: The React component that renders each individual variation item in the modal
- **Pizza_Category**: A classification for pizzas (Tradicional, Especiais, Doces) used to organize the menu
- **Subcategory_Field**: The `subcategory` field in the Product interface that stores the pizza category
- **Ingredients_Field**: The `ingredients` string[] field in the Product interface that stores the list of ingredients
- **CustomIngredients_Field**: The `customIngredients` string field for additional ingredient notes
- **Extras**: Optional add-ons for pizzas including stuffed crust (borda recheada) and additional toppings (adicionais)
- **Borda_Recheada**: Stuffed crust option with varieties like catupiry and cheddar, priced at +R$7,00
- **Adicionais**: Additional toppings that can be added to pizzas, priced at +R$5,00 each

## Requirements

### Requirement 1: Display Pizza Size Names

**User Story:** As an administrator, I want to see the actual size names (fatia, broto, médio, grande) when editing pizza variations, so that I can identify which price corresponds to which size.

#### Acceptance Criteria

1. WHEN the Variations_Modal is opened for a Pizza_Product, THE Admin_Menu_Screen SHALL display each Size_Variation with its corresponding size name from the Prices_Field keys
2. WHEN rendering a Size_Variation in the VariacaoItem_Component, THE Admin_Menu_Screen SHALL display the size name (e.g., "Fatia", "Broto") instead of the product base name
3. THE Admin_Menu_Screen SHALL preserve the existing display format for non-pizza products (espetinho variations)

### Requirement 2: Display Pizza Size Prices

**User Story:** As an administrator, I want to see the current price for each pizza size, so that I can review and update pricing accurately.

#### Acceptance Criteria

1. WHEN displaying a Size_Variation, THE Admin_Menu_Screen SHALL show the current price value from the Prices_Field for that size
2. WHEN a Pizza_Product has no price defined for a specific size, THE Admin_Menu_Screen SHALL display "0.00" as the default value
3. THE Admin_Menu_Screen SHALL format prices with two decimal places (e.g., "15.00")

### Requirement 3: Edit Pizza Size Prices

**User Story:** As an administrator, I want to edit the price for each pizza size individually, so that I can maintain accurate pricing for different pizza sizes.

#### Acceptance Criteria

1. WHEN an administrator modifies a price in the Variations_Modal, THE Admin_Menu_Screen SHALL update only the specific Size_Variation price in the Prices_Field
2. WHEN the administrator clicks "Salvar" (Save) on a Size_Variation, THE Admin_Menu_Screen SHALL persist the updated price to the database
3. WHEN a price update succeeds, THE Admin_Menu_Screen SHALL refresh the product list to reflect the new price
4. IF a price update fails, THEN THE Admin_Menu_Screen SHALL display an error message and maintain the previous price value

### Requirement 4: Detect Pizza Products

**User Story:** As a system, I need to correctly identify pizza products, so that I can apply the appropriate variation display logic.

#### Acceptance Criteria

1. WHEN determining if a product is a Pizza_Product, THE Admin_Menu_Screen SHALL check if the product category contains "pizza" (case-insensitive)
2. WHEN a product is identified as a Pizza_Product, THE Admin_Menu_Screen SHALL use the Prices_Field for variation data instead of treating it as separate product records
3. WHEN a product is not a Pizza_Product, THE Admin_Menu_Screen SHALL use the existing variation grouping logic based on product name

### Requirement 5: Handle Missing Size Configurations

**User Story:** As an administrator, I want the system to handle cases where pizza sizes are not configured, so that I can still edit existing pizza products.

#### Acceptance Criteria

1. WHEN the Variations_Modal is opened for a Pizza_Product and no pizza size configuration exists, THE Admin_Menu_Screen SHALL display all sizes present in the product's Prices_Field
2. WHEN displaying sizes from the Prices_Field, THE Admin_Menu_Screen SHALL maintain the order: Fatia, Broto, Médio, Grande, followed by any additional sizes alphabetically
3. IF the Prices_Field is empty or undefined, THEN THE Admin_Menu_Screen SHALL display a message indicating no variations are configured

### Requirement 6: Maintain Backward Compatibility

**User Story:** As a system, I need to maintain compatibility with existing variation editing for non-pizza products, so that espetinho and other product variations continue to work correctly.

#### Acceptance Criteria

1. WHEN editing non-pizza products with variations (e.g., espetinho), THE Admin_Menu_Screen SHALL continue to use the existing VariacaoItem_Component behavior
2. WHEN saving non-pizza variations, THE Admin_Menu_Screen SHALL update the product name and price fields as before
3. THE Admin_Menu_Screen SHALL not modify the behavior of the "Editar Completo" (Full Edit) button for any product type

### Requirement 7: Pizza Category Organization

**User Story:** As an administrator, I want to organize pizzas into categories (Tradicional, Especiais, Doces), so that customers can easily browse pizzas by type.

#### Acceptance Criteria

1. WHEN creating or editing a Pizza_Product, THE Admin_Menu_Screen SHALL allow selection of a Pizza_Category from predefined options
2. THE Admin_Menu_Screen SHALL support three Pizza_Category values: "Tradicional", "Especiais", and "Doces"
3. WHEN a Pizza_Category is assigned, THE Admin_Menu_Screen SHALL store it in the Subcategory_Field of the Product
4. WHEN displaying pizzas on the Customer_Order_Screen, THE system SHALL group pizzas by their Pizza_Category
5. WHEN no Pizza_Category is assigned to a Pizza_Product, THE system SHALL display it in a default "Outras" (Other) category

### Requirement 8: Pizza Ingredients Management

**User Story:** As an administrator, I want to define and edit the ingredients for each pizza, so that customers can see what each pizza contains.

#### Acceptance Criteria

1. WHEN creating or editing a Pizza_Product, THE Admin_Menu_Screen SHALL provide an interface to add, edit, and remove ingredients
2. WHEN ingredients are added, THE Admin_Menu_Screen SHALL store them in the Ingredients_Field as an array of strings
3. WHEN an administrator enters custom ingredient notes, THE Admin_Menu_Screen SHALL store them in the CustomIngredients_Field
4. THE Admin_Menu_Screen SHALL allow ingredients to be entered as individual items (e.g., "Molho de tomate artesanal", "Muçarela", "Manjericão fresco")
5. WHEN saving a Pizza_Product, THE Admin_Menu_Screen SHALL validate that at least one ingredient is provided

### Requirement 9: Ingredients Display in Admin Screen

**User Story:** As an administrator, I want to see pizza ingredients in the menu management screen, so that I can quickly review what each pizza contains.

#### Acceptance Criteria

1. WHEN viewing the product list in the Admin_Menu_Screen, THE system SHALL display the ingredients for each Pizza_Product
2. WHEN a Pizza_Product has more than 3 ingredients, THE Admin_Menu_Screen SHALL display the first 3 ingredients followed by "..." to indicate more
3. WHEN a Pizza_Product has CustomIngredients_Field content, THE Admin_Menu_Screen SHALL display it alongside the regular ingredients
4. THE Admin_Menu_Screen SHALL format ingredients as a comma-separated list

### Requirement 10: Ingredients Display in Customer Screen

**User Story:** As a customer, I want to see the ingredients for each pizza when ordering, so that I can make informed choices based on my preferences.

#### Acceptance Criteria

1. WHEN viewing pizzas on the Customer_Order_Screen, THE system SHALL display all ingredients for each Pizza_Product
2. WHEN a Pizza_Product has ingredients in the Ingredients_Field, THE Customer_Order_Screen SHALL display them as a formatted list
3. WHEN a Pizza_Product has CustomIngredients_Field content, THE Customer_Order_Screen SHALL display it as additional information
4. THE Customer_Order_Screen SHALL format ingredients in a readable manner (e.g., comma-separated or bulleted list)

### Requirement 11: Extras and Borders Configuration

**User Story:** As an administrator, I want to configure available extras and borders for pizzas, so that customers can customize their orders.

#### Acceptance Criteria

1. THE Admin_Menu_Screen SHALL provide a configuration interface for pizza Extras
2. THE Admin_Menu_Screen SHALL support configuration of Borda_Recheada options with individual names (e.g., "Catupiry", "Cheddar")
3. WHEN configuring Borda_Recheada, THE Admin_Menu_Screen SHALL allow setting a price (default: R$7,00)
4. THE Admin_Menu_Screen SHALL support configuration of Adicionais (additional toppings) with individual names
5. WHEN configuring Adicionais, THE Admin_Menu_Screen SHALL allow setting a price per item (default: R$5,00)
6. THE Admin_Menu_Screen SHALL store extras configuration in a way that can be referenced by pizza orders

### Requirement 12: Extras Selection in Customer Screen

**User Story:** As a customer, I want to add extras and borders to my pizza order, so that I can customize it to my preferences.

#### Acceptance Criteria

1. WHEN selecting a Pizza_Product on the Customer_Order_Screen, THE system SHALL display available Borda_Recheada options
2. WHEN selecting a Pizza_Product on the Customer_Order_Screen, THE system SHALL display available Adicionais options
3. WHEN a customer selects a Borda_Recheada option, THE system SHALL add its price to the pizza total
4. WHEN a customer selects Adicionais, THE system SHALL add the price for each selected item to the pizza total
5. THE Customer_Order_Screen SHALL display the base pizza price and the additional cost for selected extras separately
6. WHEN a customer adds a pizza with extras to the cart, THE system SHALL store the selected extras with the order item

### Requirement 13: Size-Based Pricing Display

**User Story:** As a customer, I want to see the price range for each pizza based on available sizes, so that I understand the pricing before selecting a size.

#### Acceptance Criteria

1. WHEN displaying a Pizza_Product on the Customer_Order_Screen, THE system SHALL show the price range from the Prices_Field
2. THE Customer_Order_Screen SHALL format the price range as "R$[min] - R$[max]" (e.g., "R$29,90 - R$49,90")
3. WHEN a Pizza_Product has only one size, THE Customer_Order_Screen SHALL display a single price instead of a range
4. THE Customer_Order_Screen SHALL display size names with their individual prices when the customer expands pizza details
