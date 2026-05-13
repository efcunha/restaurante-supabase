import figma from '@figma/code-connect';
import { FieldRow } from './FieldRow';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=65:67', {
  example: () => <FieldRow label="Email" required children={null} />,
});
