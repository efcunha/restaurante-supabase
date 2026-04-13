/**
 * Figma Code Connect — Badge (restaurante-web / React Native Web)
 *
 * Maps Figma Badge → React Native <Badge /> (web build).
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Badge } from '../components/ui-next/Badge';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:32', {
  example: () => (
    <Badge variant="success" label="Ativo" />
  ),
});
