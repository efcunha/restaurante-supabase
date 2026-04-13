/**
 * Figma Code Connect — FormInput (restaurante-app / React Native)
 *
 * Maps Figma Input → React Native <FormInput />.
 *
 * Figma component properties required:
 *   "Label"       (text)       → label prop
 *   "Placeholder" (text)       → placeholder prop
 *   "State"       (variant)    → Default | Focus | Error | Disabled
 *   "WithIcon"    (boolean)    → show leading icon
 *   "IconName"    (text)       → ionicon name
 *   "HelperText"  (text)       → helper/error text
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { FormInput } from './FormInput';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:41', {
  example: () => (
    <FormInput
      label="Nome do cliente"
      placeholder="Digite o nome"
      state="default"
      icon="person"
      helperText="Campo obrigatorio"
      value=""
      onChangeText={() => {}}
    />
  ),
});
