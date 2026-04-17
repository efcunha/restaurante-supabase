import { EnderecoForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

const meta: Meta<typeof EnderecoForm> = {
  title: 'Forms/EnderecoForm',
  component: EnderecoForm,
  decorators: [(Story) => <div style={{ maxWidth: 400, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof EnderecoForm>;

export const Default: Story = {
  args: { onSubmit: () => undefined },
};

export const WithValidationErrors: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText('Salvar endereco');
    await userEvent.click(button);
  },
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], '01310100');
    await userEvent.type(inputs[1], 'Av Paulista');
    await userEvent.type(inputs[2], '1000');
    await userEvent.type(inputs[3], 'Bela Vista');
    await userEvent.type(inputs[4], 'Sao Paulo');
    await userEvent.type(inputs[5], 'SP');
    await userEvent.type(inputs[6], 'Sala 101');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], '01310100');
    await userEvent.type(inputs[1], 'Av Paulista');
    await userEvent.type(inputs[2], '1000');
    await userEvent.type(inputs[3], 'Bela Vista');
    await userEvent.type(inputs[4], 'Sao Paulo');
    await userEvent.type(inputs[5], 'SP');
    const button = canvas.getByText('Salvar endereco');
    await userEvent.click(button);
  },
};
