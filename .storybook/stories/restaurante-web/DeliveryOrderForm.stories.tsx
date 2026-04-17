import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DeliveryOrderForm } from '../../../restaurante-web/src/features/delivery/components/DeliveryOrderForm';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';

interface DeliveryOrderFormHarnessProps {
  initialClientName?: string;
  initialPhone?: string;
  initialCep?: string;
  initialAddress?: string;
  initialFee?: string;
  initialPaymentMethod?: PaymentMethod;
  initialChangeFor?: string;
  isSearchingCep?: boolean;
}

function DeliveryOrderFormHarness({
  initialClientName = '',
  initialPhone = '',
  initialCep = '',
  initialAddress = '',
  initialFee = '',
  initialPaymentMethod = 'pix',
  initialChangeFor = '',
  isSearchingCep = false,
}: DeliveryOrderFormHarnessProps): JSX.Element {
  const [clientName, setClientName] = useState(initialClientName);
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [deliveryCep, setDeliveryCep] = useState(initialCep);
  const [deliveryAddress, setDeliveryAddress] = useState(initialAddress);
  const [deliveryFee, setDeliveryFee] = useState(initialFee);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [changeFor, setChangeFor] = useState(initialChangeFor);

  return (
    <DeliveryOrderForm
      clientName={clientName}
      onChangeClientName={setClientName}
      customerPhone={customerPhone}
      onChangeCustomerPhone={setCustomerPhone}
      deliveryCep={deliveryCep}
      onChangeDeliveryCep={setDeliveryCep}
      isSearchingCep={isSearchingCep}
      deliveryAddress={deliveryAddress}
      onChangeDeliveryAddress={setDeliveryAddress}
      deliveryFee={deliveryFee}
      onChangeDeliveryFee={setDeliveryFee}
      paymentMethod={paymentMethod}
      onChangePaymentMethod={(value) => setPaymentMethod(value as PaymentMethod)}
      changeFor={changeFor}
      onChangeChangeFor={setChangeFor}
    />
  );
}

const meta: Meta<typeof DeliveryOrderFormHarness> = {
  title: 'Projects/Restaurante Web/Forms/DeliveryOrderForm',
  component: DeliveryOrderFormHarness,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof DeliveryOrderFormHarness>;

export const Default: Story = { args: {} };

export const Error: Story = {
  args: {
    initialClientName: '',
    initialAddress: '',
    initialFee: '-5',
    initialPaymentMethod: 'dinheiro',
  },
};

export const Loading: Story = {
  args: {
    initialCep: '58000000',
    isSearchingCep: true,
  },
};

export const Disabled: Story = {
  render: () =>
    withDisabledFieldset(() => (
      <DeliveryOrderFormHarness
        initialClientName="Cliente Bloqueado"
        initialPhone="11999999999"
        initialAddress="Rua Exemplo, 123"
        initialPaymentMethod="pix"
      />
    )),
};

export const Filled: Story = {
  args: {
    initialClientName: 'Maria Delivery',
    initialPhone: '11999887766',
    initialCep: '01310100',
    initialAddress: 'Av Paulista, 1000 - Bela Vista',
    initialFee: '8,50',
    initialPaymentMethod: 'dinheiro',
    initialChangeFor: '100,00',
  },
};
