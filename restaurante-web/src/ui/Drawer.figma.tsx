/**
 * Figma Code Connect — Drawer (restaurante-web / React Native Web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Drawer } from '../components/ui-next/Drawer';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:4', {
  example: () => (
    <Drawer visible side="left" width={300} onClose={() => {}}>
      <></>
    </Drawer>
  ),
});
