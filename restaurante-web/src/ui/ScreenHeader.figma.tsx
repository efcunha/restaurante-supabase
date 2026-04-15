import figma from '@figma/code-connect';
import { ScreenHeader } from './ScreenHeader';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=65:63', {
  example: () => <ScreenHeader title="Caixa" subtitle="Operador: Ana" />,
});
