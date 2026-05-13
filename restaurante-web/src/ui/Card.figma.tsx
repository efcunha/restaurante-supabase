/**
 * Figma Code Connect — Card (restaurante-web / React Native Web)
 *
 * Maps Figma Card → React Native <Card /> (web build).
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Card } from '../components/ui-next/Card';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:21', {
  example: () => (
    <Card elevated="low" padded>
      <></>
    </Card>
  ),
});
