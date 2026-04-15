import figma from '@figma/code-connect';
import { ScreensCatalog } from './ScreensCatalog';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=99:1', {
  example: () => <ScreensCatalog />,
});
