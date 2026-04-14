import figma from '@figma/code-connect';
import { RestaurantCard } from '../components/ui-next/RestaurantCard';

figma.connect('https://figma.com/design/xpfdEjj5NJ7bQ7zDuCBbqw/RestaurantOS-Design-System?node-id=7:2', {
  example: () => <RestaurantCard name="Restaurante Central" subtitle="Rua das Flores" status="Aberto" />,
});
