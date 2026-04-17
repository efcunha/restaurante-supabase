import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NewOrderHeaderForm } from '../../../restaurante-web/src/features/new-order/components/NewOrderHeaderForm';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

interface NewOrderHeaderHarnessProps {
  initialClientName?: string;
  initialMesa?: string;
  loading?: boolean;
}

function NewOrderHeaderHarness({
  initialClientName = '',
  initialMesa = '',
  loading = false,
}: NewOrderHeaderHarnessProps): JSX.Element {
  const [clientName, setClientName] = useState(initialClientName);
  const [mesa, setMesa] = useState(initialMesa);

  return (
    <div style={{ position: 'relative' }}>
      <NewOrderHeaderForm
        clientName={clientName}
        onClientNameChange={setClientName}
        mesa={mesa}
        onMesaChange={setMesa}
      />
      {loading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Carregando dados do pedido...
        </div>
      ) : null}
    </div>
  );
}

const meta: Meta<typeof NewOrderHeaderHarness> = {
  title: 'Projects/Restaurante Web/Forms/NewOrderHeaderForm',
  component: NewOrderHeaderHarness,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof NewOrderHeaderHarness>;

export const Default: Story = { args: {} };

export const Error: Story = {
  args: {
    initialClientName: '',
    initialMesa: 'A1',
  },
};

export const Loading: Story = {
  args: {
    initialClientName: 'Carregando',
    initialMesa: '12',
    loading: true,
  },
};

export const Disabled: Story = {
  render: () =>
    withDisabledFieldset(() => (
      <NewOrderHeaderHarness initialClientName="Cliente" initialMesa="5" />
    )),
};

export const Filled: Story = {
  args: {
    initialClientName: 'Cliente Balcao',
    initialMesa: '14',
  },
};
