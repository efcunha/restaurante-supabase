import figma from '@figma/code-connect';
import { SectionHeader } from './index';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=6:3', {
  example: () => <SectionHeader title="Pedidos" subtitle="Atualizado agora" />,
});
