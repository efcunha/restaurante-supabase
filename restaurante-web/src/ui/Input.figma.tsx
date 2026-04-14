/**
 * Figma Code Connect — Input (restaurante-web / React Native Web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Input } from '../components/ui-next/Input';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:5', {
  example: () => (
    <Input placeholder="Digite aqui..." hasError={false} />
  ),
});
