import { Text, View } from 'react-native';
import { Card } from './index';

const meta = {
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
export const Low = {};

export const Medium = {
  args: {
    elevated: 'medium',
  },
};

export const High = {
  args: {
    elevated: 'high',
  },
};

export const NoPadding = {
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

export const EmptyState = {
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
