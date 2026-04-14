/**
 * Figma Code Connect — Toast (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Toast } from '../components/ui-next/Toast';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:12', {
  example: () => (
    <Toast message="Pedido salvo com sucesso!" variant="success" />
  ),
});
