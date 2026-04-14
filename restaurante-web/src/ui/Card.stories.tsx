import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../components/ui-next/Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    padded: true,
    elevated: 'low',
    children: (
      <View>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Resumo de comanda</Text>
        <Text>2 itens · R$ 74,80</Text>
      </View>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Low: Story = {};

export const Medium: Story = {
  args: {
    elevated: 'medium',
  },
};

export const High: Story = {
  args: {
    elevated: 'high',
  },
};

export const NoPadding: Story = {
  args: {
    padded: false,
    children: (
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Sem padding interno</Text>
        <Text>Conteudo controlado pela tela/container.</Text>
      </View>
    ),
  },
};

export const EmptyState: Story = {
  args: {
    elevated: 'low',
    children: (
      <View>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Nenhum item encontrado</Text>
        <Text>Adicione produtos para iniciar a comanda.</Text>
      </View>
    ),
  },
};
