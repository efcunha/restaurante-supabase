import { Checkbox } from '../components/ui-next/Checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    checked: false,
    label: 'Aceitar termos',
    onChange: () => {},
  },
};

export default meta;
export const Unchecked = {};

export const Checked = {
  args: { checked: true, label: 'Item selecionado' },
};
