import { Toast } from '../components/ui-next/Toast';

const meta = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: {
    message: 'Pedido salvo com sucesso!',
    variant: 'success',
  },
};

export default meta;
export const Success = {};

export const Error = {
  args: { message: 'Erro ao salvar pedido', variant: 'error' },
};

export const Warning = {
  args: { message: 'Estoque baixo', variant: 'warning' },
};

export const Info = {
  args: { message: 'Novo pedido recebido', variant: 'info' },
};
