import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { AdminSection } from './AdminSection';
import { AdminActionCard } from './AdminActionCard';

const meta: Meta<typeof AdminSection> = {
  title: 'Features/Admin/AdminSection',
  component: AdminSection,
  args: {
    title: 'FINANCEIRO',
    showDivider: true,
  },
  decorators: [
    (Story) => (
      <View style={{ width: 760, maxWidth: '100%', padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AdminSection>;

export const FinancialGrid: Story = {
  render: (args) => (
    <AdminSection {...args}>
      <AdminActionCard name="Assinatura SaaS" icon="💳" subtitle="Gestao de cobranca" onPress={() => undefined} />
      <AdminActionCard name="Dashboard Financeiro" icon="📊" subtitle="Receita, ticket e perdas" onPress={() => undefined} />
      <AdminActionCard name="Relatorio de Cancelamentos" icon="🧾" subtitle="Eventos auditaveis" onPress={() => undefined} />
      <AdminActionCard name="Config. Financeira" icon="⚙️" subtitle="Parametros de operacao" onPress={() => undefined} />
    </AdminSection>
  ),
};

export const SystemGrid: Story = {
  args: {
    title: 'SISTEMA',
  },
  render: (args) => (
    <AdminSection {...args}>
      <AdminActionCard name="Gerenciar Funcionarios" icon="👥" subtitle="RBAC por empresa" onPress={() => undefined} />
      <AdminActionCard name="Configurar Mesas" icon="🪑" subtitle="Mapa e ambientes" onPress={() => undefined} />
      <AdminActionCard name="Configurar Impressora" icon="🖨️" subtitle="PDV e cozinha" onPress={() => undefined} />
      <AdminActionCard name="Configurar MFA (2FA)" icon="🛡️" subtitle="Hardening de autenticacao" onPress={() => undefined} />
    </AdminSection>
  ),
};
