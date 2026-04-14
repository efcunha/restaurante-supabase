/**
 * Figma Code Connect — Modal (restaurante-web / React Native Web)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Modal } from '../components/ui-next/Modal';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:7', {
  example: () => (
    <Modal visible onClose={() => {}}>
      <></>
    </Modal>
  ),
});
