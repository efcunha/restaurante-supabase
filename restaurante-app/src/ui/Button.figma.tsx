/**
 * Figma Code Connect — Button (restaurante-app / React Native)
 *
 * Maps Figma Button → React Native <Button />.
 *
 * Figma component properties required:
 *   "Label"   (text)       → label prop
 *   "Variant" (variant)    → Primary | Secondary | Ghost | Danger
 *   "Size"    (variant)    → Small | Medium | Large
 *   "State"   (variant)    → Default | Disabled | Loading
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Button } from './Button';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:12', {
  example: () => (
    <Button
      label="Confirmar"
      onPress={() => {}}
      variant="primary"
      size="md"
      disabled={false}
      loading={false}
      fullWidth
    />
  ),
});
