import figma from '@figma/code-connect';
import { Sidebar } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=7:3', {
  example: () => <Sidebar title="Menu" items={[{ id: '1', label: 'Pedidos', onPress: () => {}, isActive: true }]} />,
});
