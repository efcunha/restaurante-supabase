import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StateView } from '../../../ui';

const meta: Meta<typeof StateView> = {
  title: 'Features/Admin/AdminStateViewMatrix',
  component: StateView,
  decorators: [
    (Story) => (
      <View style={{ width: 760, maxWidth: '100%', padding: 16, gap: 12 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StateView>;

export const Matrix: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <StateView state="loading" message="Carregando metricas do painel admin..." />
      <StateView state="error" message="Falha ao carregar estatisticas financeiras." onRetry={() => undefined} />
      <StateView state="empty" message="Nenhum dado disponivel para o periodo selecionado." onRetry={() => undefined} />
      <StateView state="ready">
        <View style={{ padding: 16 }} />
      </StateView>
    </View>
  ),
};
