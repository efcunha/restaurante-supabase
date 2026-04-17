import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';
import { ExternalPosPaymentForm } from '../../../restaurante-web/src/features/payments/components/ExternalPosPaymentForm';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof ExternalPosPaymentForm> = {
  title: 'Projects/Restaurante Web/Forms/ExternalPosPaymentForm',
  component: ExternalPosPaymentForm,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof ExternalPosPaymentForm>;

export const Default: Story = {
  args: {
    defaultAmount: '35,90',
    onSubmit: async () => undefined,
  },
};

export const Error: Story = {
  args: {
    defaultAmount: '0',
    onSubmit: async () => undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Confirmar Recebimento Externo'));
  },
};

export const Loading: Story = {
  args: {
    defaultAmount: '35,90',
    isBusy: true,
    onSubmit: async () => undefined,
  },
};

export const Disabled: Story = {
  render: () =>
    withDisabledFieldset(() => (
      <ExternalPosPaymentForm defaultAmount="35,90" onSubmit={async () => undefined} />
    )),
};

export const Filled: Story = {
  args: {
    defaultAmount: '45,90',
    onSubmit: async () => undefined,
  },
  play: async ({ canvasElement }) => {
    const inputs = Array.from(canvasElement.querySelectorAll('input, textarea')) as HTMLElement[];
    if (inputs[1]) await userEvent.type(inputs[1], '987654321');
    if (inputs[2]) await userEvent.type(inputs[2], '1234');
    if (inputs[3]) await userEvent.type(inputs[3], 'Pagamento externo validado');
  },
};
