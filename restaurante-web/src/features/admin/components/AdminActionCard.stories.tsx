import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { AdminActionCard } from './AdminActionCard';

const meta: Meta<typeof AdminActionCard> = {
  title: 'Features/Admin/AdminActionCard',
  component: AdminActionCard,
  args: {
    name: 'Relatorio de Cancelamentos',
    icon: '🧾',
    subtitle: 'Auditoria de perdas e estornos',
    onPress: () => undefined,
    danger: false,
    disabled: false,
  },
  decorators: [
    (Story) => (
      <View style={{ width: 340, padding: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AdminActionCard>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    name: 'Excluir dados operacionais',
    icon: '⚠️',
    danger: true,
    subtitle: 'Acao destrutiva com confirmacao obrigatoria',
  },
};

export const Disabled: Story = {
  args: {
    name: 'Assinatura SaaS',
    icon: '💳',
    subtitle: 'Feature flag desativada',
    disabled: true,
  },
};
