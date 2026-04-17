import { CheckoutForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { fillCheckout, triggerLoading, triggerValidationError } from '../shared/formInteractions';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof CheckoutForm> = {
  title: 'Projects/Restaurante Web/Forms/CheckoutForm',
  component: CheckoutForm,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof CheckoutForm>;

export const Default: Story = { args: { onSubmit: () => undefined } };

export const Error: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await triggerValidationError(canvasElement, 'Finalizar pedido');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await triggerLoading(canvasElement, 'Finalizar pedido', fillCheckout);
  },
};

export const Disabled: Story = {
  render: () => withDisabledFieldset(() => <CheckoutForm onSubmit={() => undefined} />),
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await fillCheckout(canvasElement);
  },
};
