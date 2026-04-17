import { CadastroForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

const meta: Meta<typeof CadastroForm> = {
  title: 'Forms/CadastroForm',
  component: CadastroForm,
  decorators: [(Story) => <div style={{ maxWidth: 400, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof CadastroForm>;

export const Default: Story = {
  args: { onSubmit: () => undefined },
};

export const WithValidationErrors: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText('Criar conta');
    await userEvent.click(button);
  },
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'Maria Silva');
    await userEvent.type(inputs[1], 'maria@empresa.com');
    await userEvent.type(inputs[2], '11999887766');
    await userEvent.type(inputs[3], 'senhaSegura123');
    await userEvent.type(inputs[4], 'senhaSegura123');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'Maria Silva');
    await userEvent.type(inputs[1], 'maria@empresa.com');
    await userEvent.type(inputs[2], '11999887766');
    await userEvent.type(inputs[3], 'senhaSegura123');
    await userEvent.type(inputs[4], 'senhaSegura123');
    const button = canvas.getByText('Criar conta');
    await userEvent.click(button);
  },
};

export const PasswordMismatch: Story = {
  name: 'Senhas diferentes',
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'Maria Silva');
    await userEvent.type(inputs[1], 'maria@empresa.com');
    await userEvent.type(inputs[2], '11999887766');
    await userEvent.type(inputs[3], 'senhaSegura123');
    await userEvent.type(inputs[4], 'outraSenha456');
    const button = canvas.getByText('Criar conta');
    await userEvent.click(button);
  },
};
