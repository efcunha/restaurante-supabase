/**
 * Figma Code Connect — PublicMenuScreen (restaurante-web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import PublicMenuScreen from './PublicMenuScreen';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:5', {
  example: () => <PublicMenuScreen slug="restaurante-demo" />,
});
