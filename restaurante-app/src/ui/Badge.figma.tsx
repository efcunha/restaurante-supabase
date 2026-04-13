/**
 * Figma Code Connect — Badge (restaurante-app / React Native)
 *
 * Maps Figma Badge → React Native <Badge />.
 *
 * Figma component properties required:
 *   "Label"     (text)       → children
 *   "Variant"   (variant)    → Success | Warning | Error | Info | Neutral
 *   "WithDot"   (boolean)    → show dot indicator
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Badge } from '../components/ui-next/Badge';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:32', {
  example: () => (
    <Badge variant="success" dot={false}>
      Ativo
    </Badge>
  ),
});
