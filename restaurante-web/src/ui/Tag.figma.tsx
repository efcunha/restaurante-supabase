/**
 * Figma Code Connect — Tag (restaurante-web / React Native Web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Tag } from '../components/ui-next/Tag';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:11', {
  example: () => (
    <Tag label="Categoria" active={false} />
  ),
});
