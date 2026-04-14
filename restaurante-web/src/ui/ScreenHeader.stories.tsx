import { ScreenHeader } from './ScreenHeader';

const meta = {
  title: 'UI/ScreenHeader',
  component: ScreenHeader,
  tags: ['autodocs'],
  args: {
    title: 'Caixa',
    subtitle: 'Operador: Joao',
  },
};

export default meta;

export const Default = {};

export const WithActions = {
  args: {
    leftAction: { label: 'Voltar', onPress: () => {} },
    rightAction: { label: 'Atualizar', onPress: () => {} },
  },
};
