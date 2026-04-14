import { Tabs } from '../components/ui-next/Tabs';

const items = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'prontos', label: 'Prontos' },
];

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: {
    items,
    activeKey: 'todos',
    onChange: () => {},
  },
};

export default meta;
export const Default = {};

export const SecondActive = {
  args: { activeKey: 'pendentes' },
};
