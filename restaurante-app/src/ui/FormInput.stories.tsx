import { useState } from 'react';
import { FormInput } from './index';

const meta = {
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
export const Default = {};

export const Error = {
  args: {
    error: 'Nome obrigatorio',
    helperText: '',
  },
};

export const Password = {
  args: {
    label: 'Senha de acesso',
    placeholder: 'Digite sua senha',
    helperText: 'Minimo de 8 caracteres',
    secureTextEntry: true,
    error: '',
  },
};

export const WithLongValue = {
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
