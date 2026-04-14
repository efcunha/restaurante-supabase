import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormInput } from './index';

const meta: Meta<typeof FormInput> = {
  title: 'UI/FormInput',
  component: FormInput,
  tags: ['autodocs'],
  args: {
    label: 'Nome do cliente',
    placeholder: 'Digite o nome',
    helperText: 'Campo obrigatorio para abrir comanda',
    error: '',
  },
  render: (args) => {
    const [value, setValue] = useState('');

    return <FormInput {...args} value={value} onChangeText={setValue} />;
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
  args: {
    error: 'Nome obrigatorio',
    helperText: '',
  },
};

export const Password: Story = {
  args: {
    label: 'Senha de acesso',
    placeholder: 'Digite sua senha',
    helperText: 'Minimo de 8 caracteres',
    secureTextEntry: true,
    error: '',
  },
};

export const WithLongValue: Story = {
  args: {
    label: 'Observacoes',
    placeholder: 'Adicione observacoes',
    helperText: 'Exemplo de campo com texto mais longo',
  },
  render: (args) => (
    <FormInput
      {...args}
      value="Sem cebola, sem picles e ponto da carne bem passado."
      onChangeText={() => {}}
    />
  ),
};
