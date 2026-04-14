import { Text, View } from 'react-native';
import { StateView } from './StateView';

const meta = {
  title: 'UI/StateView',
  component: StateView,
  tags: ['autodocs'],
  args: {
    state: 'loading',
    skeletonRows: 5,
    message: 'Aguarde enquanto atualizamos os dados.',
  },
};

export default meta;

export const Loading = {};

export const Empty = {
  args: {
    state: 'empty',
    message: 'Nenhum pedido encontrado para este filtro.',
    onRetry: () => {},
  },
};

export const Error = {
  args: {
    state: 'error',
    message: 'Falha de rede ao carregar pedidos.',
    onRetry: () => {},
  },
};

export const Ready = {
  args: {
    state: 'ready',
    children: (
      <View>
        <Text>Conteudo carregado com sucesso.</Text>
      </View>
    ),
  },
};

export const Disabled = {
  args: {
    state: 'error',
    message: 'Modo somente leitura.',
  },
};
