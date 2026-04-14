/**
 * Figma Code Connect — Select (restaurante-app / React Native)
 *
 * CLI: npx figma connect publish --token $FIGMA_TOKEN
 */
import figma from '@figma/code-connect';
import { Select } from '../components/ui-next/Select';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=8:9', {
  example: () => (
    <Select
      options={[{ label: 'Balcao', value: 'balcao' }]}
      onSelect={() => {}}
    />
  ),
});
