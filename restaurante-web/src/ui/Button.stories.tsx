import { Button } from './index';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    label: 'Confirmar pedido',
    onPress: () => {},
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    disabled: false,
    loading: false,
  },
  tags: ['autodocs'],
};

export default meta;
export const Primary = {};

export const Secondary = {
  args: {
    variant: 'secondary',
    label: 'Voltar',
  },
};

export const Loading = {
  args: {
    loading: true,
    label: 'Processando...',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    label: 'Indisponivel',
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    label: 'Cancelar',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    label: 'Remover item',
  },
};

export const FullWidthLarge = {
  args: {
    size: 'lg',
    fullWidth: true,
    label: 'Finalizar pedido',
  },
};
