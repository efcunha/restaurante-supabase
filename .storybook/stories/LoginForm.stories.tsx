import { LoginForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

const meta: Meta<typeof LoginForm> = {
  title: 'Forms/LoginForm',
  component: LoginForm,
  decorators: [(Story) => <div style={{ maxWidth: 400, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: { onSubmit: () => undefined },
};

export const WithValidationErrors: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText('Entrar');
    await userEvent.click(button);
  },
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'usuario@empresa.com');
    await userEvent.type(inputs[1], 'senhaSegura123');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'usuario@empresa.com');
    await userEvent.type(inputs[1], 'senhaSegura123');
    const button = canvas.getByText('Entrar');
    await userEvent.click(button);
  },
};
