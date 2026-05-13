import figma from '@figma/code-connect';
import { DataListItem } from './DataListItem';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:7', {
  example: () => <DataListItem title="Pedido #1201" subtitle="Mesa 2" meta="3 min" status="warning" />,
});
