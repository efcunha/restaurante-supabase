/**
 * Figma Code Connect — ProductCard (restaurante-web / React Native Web)
 *
 * Maps Figma ProductCard → React Native <ProductCard /> (web build).
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { ProductCard } from '../components/ui-next/ProductCard';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:51', {
  example: () => (
    <ProductCard
      name="Pizza Marguerita"
      description="Molho artesanal, mussarela e manjericao"
      category="Pizza"
      priceLabel="R$ 49,90"
      onPress={() => {}}
    />
  ),
});
