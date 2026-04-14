import React from 'react';
import { Text } from 'react-native';
import { Drawer } from '../components/ui-next/Drawer';

const meta = {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  args: {
    visible: true,
    side: 'left',
    width: 300,
    onClose: () => {},
  },
};

export default meta;

export const Left = {
  render: (args: { visible: boolean; side: 'left' | 'right'; width: number; onClose: () => void }) => (
    <Drawer {...args}>
      <Text>Menu lateral</Text>
    </Drawer>
  ),
};

export const Right = {
  args: { side: 'right' },
  render: (args: { visible: boolean; side: 'left' | 'right'; width: number; onClose: () => void }) => (
    <Drawer {...args}>
      <Text>Painel de filtros</Text>
    </Drawer>
  ),
};
