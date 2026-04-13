/**
 * Figma Code Connect — Card (restaurante-app / React Native)
 *
 * Maps Figma Card → React Native <Card />.
 *
 * Figma component properties required:
 *   "Elevation" (variant) → None | Low | Medium | High
 *   "Padding"   (variant) → None | Small | Medium | Large
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Card } from './Card';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:21', {
  example: () => (
    <Card elevated="low" padding="md">
      {/* Children defined in Figma */}
    </Card>
  ),
});
