import { Sidebar } from '../components/ui-next/Sidebar';

const meta = {
  title: 'UI/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  args: {
    title: 'Navegacao',
    items: [
      { id: 'dashboard', label: 'Dashboard', onPress: () => {}, isActive: true },
      { id: 'pedidos', label: 'Pedidos', onPress: () => {} },
      { id: 'caixa', label: 'Caixa', onPress: () => {} },
      { id: 'config', label: 'Configuracoes', onPress: () => {} },
    ],
  },
};

export default meta;

export const Default = {};

export const SingleItem = {
  args: {
    items: [{ id: 'only', label: 'Unico', onPress: () => {}, isActive: true }],
  },
};
