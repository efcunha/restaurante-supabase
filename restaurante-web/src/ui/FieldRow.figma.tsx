import figma from '@figma/code-connect';
import { FieldRow } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:6', {
  example: () => <FieldRow label="Email" required children={null} />,
});
