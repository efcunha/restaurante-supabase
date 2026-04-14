import { Select } from '../components/ui-next/Select';

const options = [
  { label: 'Balcao', value: 'balcao' },
  { label: 'Mesa', value: 'mesa' },
  { label: 'Delivery', value: 'delivery' },
];

const meta = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    options,
    placeholder: 'Selecionar tipo...',
    onSelect: () => {},
  },
};

export default meta;
export const Default = {};

export const WithSelection = {
  args: { value: 'mesa' },
};
