import figma from '@figma/code-connect';
import { FormsCatalog } from './FormsCatalog';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=9:30', {
  example: () => <FormsCatalog />,
});
