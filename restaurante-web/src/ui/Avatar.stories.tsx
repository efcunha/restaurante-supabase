import { Avatar } from '../components/ui-next/Avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: {
    name: 'João Silva',
    size: 40,
  },
};

export default meta;
export const Default = {};

export const Small = {
  args: { name: 'Maria', size: 28 },
};

export const Large = {
  args: { name: 'Carlos Oliveira', size: 56 },
};

export const SingleName = {
  args: { name: 'Admin', size: 40 },
};
