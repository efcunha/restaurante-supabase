import { Input } from '../components/ui-next/Input';

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Digite aqui...',
    hasError: false,
  },
};

export default meta;
export const Default = {};

export const WithError = {
  args: { hasError: true, placeholder: 'Campo obrigatorio' },
};

export const WithValue = {
  args: { value: 'Restaurante Bom Sabor' },
};
