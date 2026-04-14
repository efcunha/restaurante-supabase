import { RestaurantCard } from './index';

const meta = {
  title: 'UI/RestaurantCard',
  component: RestaurantCard,
  tags: ['autodocs'],
  args: {
    name: 'Restaurante Central',
    subtitle: 'Rua das Flores, 120',
    eta: '25 min',
    rating: '4.8',
    status: 'Aberto',
  },
};

export default meta;

export const Default = {};

export const Busy = {
  args: {
    status: 'Movimento intenso',
  },
};

export const Minimal = {
  args: {
    subtitle: undefined,
    eta: undefined,
    rating: undefined,
    status: undefined,
  },
};
