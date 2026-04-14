import { Button, SectionHeader } from './index';

const meta = {
  title: 'UI/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  args: {
    title: 'Pedidos urgentes',
    subtitle: 'Atualizado agora',
  },
};

export default meta;

export const Default = {};

export const WithRightSlot = {
  args: {
    rightSlot: <Button size="sm" label="Ver todos" onPress={() => {}} />,
  },
};
