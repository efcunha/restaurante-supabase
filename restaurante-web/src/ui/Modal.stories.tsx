import React from 'react';
import { Text } from 'react-native';
import { Modal } from '../components/ui-next/Modal';

const meta = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    visible: true,
    onClose: () => {},
  },
};

export default meta;

export const Default = {
  render: (args: { visible: boolean; onClose: () => void }) => (
    <Modal {...args}>
      <Text>Conteudo do modal</Text>
    </Modal>
  ),
};
