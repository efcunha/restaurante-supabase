import { Button, Navbar } from './index';

const meta = {
  title: 'UI/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  args: {
    title: 'Pedidos',
    subtitle: 'Operador: Ana',
  },
};

export default meta;

export const Default = {};

export const WithActions = {
  args: {
    leftAction: {
      label: 'Voltar',
      onPress: () => {},
    },
    rightSlot: <Button label="Salvar" onPress={() => {}} size="sm" />,
  },
};

export const NoSubtitle = {
  args: {
    subtitle: undefined,
  },
};
