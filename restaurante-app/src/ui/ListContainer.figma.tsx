import figma from '@figma/code-connect';
import { DataListItem, ListContainer } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:8', {
  example: () => (
    <ListContainer>
      <DataListItem title="Pedido #1201" />
    </ListContainer>
  ),
});
