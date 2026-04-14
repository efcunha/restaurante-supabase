import { ProductCard } from '../components/ui-next/ProductCard';

const meta = {
  title: 'UI/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  args: {
    name: 'Pizza Marguerita',
    description: 'Molho artesanal, mucarela e manjericao',
    priceLabel: 'R$ 49,90',
    category: 'Pizzas',
  },
};

export default meta;
export const Default = {};

export const Pressable = {
  args: {
    onPress: () => {},
    testID: 'product-card-pressable',
  },
};

export const Minimal = {
  args: {
    description: undefined,
    category: undefined,
    name: 'Agua sem gas',
    priceLabel: 'R$ 5,00',
  },
};

export const LongContent = {
  args: {
    name: 'Pizza especial da casa com borda recheada e ingredientes selecionados',
    description: 'Molho artesanal, queijo premium, blend de ervas frescas e finalizacao no forno a lenha.',
    category: 'Promocoes da semana',
    priceLabel: 'R$ 89,90',
  },
};
