/**
 * Figma Code Connect — ProductCard (restaurante-app / React Native)
 *
 * Maps Figma ProductCard → React Native <ProductCard />.
 *
 * Figma component properties required:
 *   "Name"    (text)       → product name
 *   "Price"   (text)       → formatted price
 *   "Image"   (image)      → product image
 *   "HasAdd"  (boolean)    → show add button
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { ProductCard } from './ProductCard';

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
