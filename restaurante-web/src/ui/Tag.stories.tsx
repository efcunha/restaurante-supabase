import { Tag } from '../components/ui-next/Tag';

const meta = {
  title: 'UI/Tag',
  component: Tag,
  tags: ['autodocs'],
  args: {
    label: 'Categoria',
    active: false,
  },
};

export default meta;
export const Default = {};

export const Active = {
  args: { label: 'Pizza', active: true },
};

export const Pressable = {
  args: { label: 'Filtro', onPress: () => {} },
};
