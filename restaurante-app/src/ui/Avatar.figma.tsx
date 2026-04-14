/**
 * Figma Code Connect — Avatar (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Avatar } from '../components/ui-next/Avatar';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:1', {
  example: () => (
    <Avatar name="João Silva" size={40} />
  ),
});
