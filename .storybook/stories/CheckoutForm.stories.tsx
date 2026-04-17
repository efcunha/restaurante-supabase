import { CheckoutForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';

const meta: Meta<typeof CheckoutForm> = {
  title: 'Forms/CheckoutForm',
  component: CheckoutForm,
  decorators: [(Story) => <div style={{ maxWidth: 400, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof CheckoutForm>;

export const Default: Story = {
  args: { onSubmit: () => undefined },
};

export const WithValidationErrors: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText('Finalizar pedido');
    await userEvent.click(button);
  },
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'Joao Santos');
    await userEvent.type(inputs[1], 'joao@email.com');
    await userEvent.type(inputs[2], 'Sem cebola, por favor');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvasElement.querySelectorAll('input');
    await userEvent.type(inputs[0], 'Joao Santos');
    await userEvent.type(inputs[1], 'joao@email.com');
    const button = canvas.getByText('Finalizar pedido');
    await userEvent.click(button);
  },
};
