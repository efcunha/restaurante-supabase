/**
 * Figma Code Connect — FormInput (restaurante-web / React Native Web)
 *
 * Maps Figma Input → React Native <FormInput /> (web build).
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { FormInput } from '../components/ui-next/FormInput';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=3:41', {
  example: () => (
    <FormInput
      label="Nome do cliente"
      placeholder="Digite o nome"
      helperText="Campo obrigatorio"
      value=""
      onChangeText={() => {}}
    />
  ),
});
