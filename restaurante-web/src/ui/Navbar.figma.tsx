import figma from '@figma/code-connect';
import { Navbar } from '../components/ui-next/Navbar';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=7:1', {
  example: () => <Navbar title="Pedidos" subtitle="Operador: Ana" />,
});
