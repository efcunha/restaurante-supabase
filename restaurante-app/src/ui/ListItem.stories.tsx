import React from 'react';
import { Text } from 'react-native';
import { ListItem } from '../components/ui-next/ListItem';

const meta = {
  title: 'UI/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  args: {
    title: 'Pizza Margherita',
    subtitle: 'R$ 42,90',
  },
};

export default meta;
export const Default = {};

export const WithSlots = {
  args: {
    title: 'Coca-Cola 350ml',
    subtitle: 'R$ 6,00',
    leftSlot: <Text>🥤</Text>,
    rightSlot: <Text>x2</Text>,
  },
};

export const Pressable = {
  args: {
    title: 'Item clicavel',
    subtitle: 'Toque para editar',
    onPress: () => {},
  },
};
