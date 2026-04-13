/**
 * Figma Code Connect — ProductCard (restaurante-web / React Native Web)
 *
 * Maps Figma ProductCard → React Native <ProductCard /> (web build).
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { ProductCard } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:51', {
  example: () => (
    <ProductCard
      name="Pizza Marguerita"
      price="R$ 49,90"
      imageUrl="https://images.unsplash.com/photo-1513104890138-7c749659a591"
      onAdd={() => {}}
    />
  ),
});
