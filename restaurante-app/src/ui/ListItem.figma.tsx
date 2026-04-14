/**
 * Figma Code Connect — ListItem (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { ListItem } from '../components/ui-next/ListItem';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:6', {
  example: () => (
    <ListItem title="Pizza Margherita" subtitle="R$ 42,90" />
  ),
});
