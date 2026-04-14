/**
 * Figma Code Connect — BottomSheet (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { BottomSheet } from '../components/ui-next/BottomSheet';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:2', {
  example: () => (
    <BottomSheet visible onClose={() => {}}>
      <></>
    </BottomSheet>
  ),
});
