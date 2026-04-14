/**
 * Figma Code Connect — AdminMenuSubscreens (restaurante-web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import React from 'react';
import ProductList from './ProductList';

const categories = [
  { label: 'Comidas', value: 'comidas' },
  { label: 'Pizzas', value: 'pizza' },
];

const products = [
  {
    id: 'p1',
    name: 'X-Bacon',
    category: 'comidas',
    price: 27.9,
    active: true,
    createdAt: Date.now(),
    inventoryItems: [],
  },
];

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:4', {
  example: () => (
    <ProductList
      products={products as any}
      categories={categories}
      isLoading={false}
      onEdit={() => undefined}
      onDelete={() => undefined}
      onToggleStatus={() => undefined}
      onManageStock={() => undefined}
    />
  ),
});
