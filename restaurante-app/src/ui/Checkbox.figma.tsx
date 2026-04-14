/**
 * Figma Code Connect — Checkbox (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Checkbox } from '../components/ui-next/Checkbox';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:3', {
  example: () => (
    <Checkbox checked={false} label="Aceitar termos" onChange={() => {}} />
  ),
});
