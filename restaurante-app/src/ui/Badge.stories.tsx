import { Badge } from '../components/ui-next/Badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    label: 'Ativo',
    variant: 'success',
  },
};

export default meta;
export const Success = {};

export const Warning = {
  args: {
    label: 'Atenção',
    variant: 'warning',
  },
};

export const Error = {
  args: {
    label: 'Bloqueado',
    variant: 'error',
  },
};

export const Info = {
  args: {
    label: 'Em andamento',
    variant: 'info',
  },
};

export const LongLabel = {
  args: {
    label: 'Aguardando confirmacao da cozinha',
    variant: 'warning',
  },
};
