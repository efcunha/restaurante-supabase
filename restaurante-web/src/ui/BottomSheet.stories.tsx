import React from 'react';
import { Text } from 'react-native';
import { BottomSheet } from '../components/ui-next/BottomSheet';

const meta = {
  title: 'UI/BottomSheet',
  component: BottomSheet,
  tags: ['autodocs'],
  args: {
    visible: true,
    onClose: () => {},
  },
};

export default meta;

export const Default = {
  render: (args: { visible: boolean; onClose: () => void }) => (
    <BottomSheet {...args}>
      <Text>Conteudo do BottomSheet</Text>
    </BottomSheet>
  ),
};

export const Hidden = {
  args: { visible: false },
  render: (args: { visible: boolean; onClose: () => void }) => (
    <BottomSheet {...args}>
      <Text>Nao visivel</Text>
    </BottomSheet>
  ),
};
