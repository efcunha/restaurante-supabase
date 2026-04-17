import type { Meta, StoryObj } from '@storybook/react';
import ProductForm from '../../../restaurante-app/src/screens/admin/menu/ProductForm';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const categories = [
  { label: 'Comidas', value: 'comidas' },
  { label: 'Pizzas', value: 'pizza' },
  { label: 'Espetinhos', value: 'espetinhos' },
];

const pizzaConfig = {
  sizes: [
    { name: 'P', maxFlavors: 1 },
    { name: 'M', maxFlavors: 2 },
    { name: 'G', maxFlavors: 3 },
  ],
  pricingMode: 'HIGHER' as const,
};

const meta: Meta<typeof ProductForm> = {
  title: 'Projects/Restaurante App/Forms/ProductForm',
  component: ProductForm,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof ProductForm>;

export const Default: Story = {
  args: {
    visible: true,
    onClose: () => undefined,
    onSave: async () => undefined,
    initialData: null,
    categories,
    pizzaConfig,
    isLoading: false,
    variationNames: ['Frango', 'Carne', 'Queijo'],
  },
};

export const Error: Story = {
  args: {
    visible: true,
    onClose: () => undefined,
    onSave: async () => undefined,
    initialData: null,
    categories,
    pizzaConfig,
    isLoading: false,
    variationNames: ['Frango', 'Carne', 'Queijo'],
  },
};

export const Loading: Story = {
  args: {
    visible: true,
    onClose: () => undefined,
    onSave: async () => undefined,
    initialData: null,
    categories,
    pizzaConfig,
    isLoading: true,
    variationNames: ['Frango', 'Carne', 'Queijo'],
  },
};

export const Disabled: Story = {
  render: () =>
    withDisabledFieldset(() => (
      <ProductForm
        visible
        onClose={() => undefined}
        onSave={async () => undefined}
        initialData={null}
        categories={categories}
        pizzaConfig={pizzaConfig}
        isLoading={false}
        variationNames={['Frango', 'Carne', 'Queijo']}
      />
    )),
};

export const Filled: Story = {
  args: {
    visible: true,
    onClose: () => undefined,
    onSave: async () => undefined,
    initialData: {
      id: 'p1',
      name: 'Pizza Portuguesa',
      category: 'pizza',
      active: true,
      createdAt: Date.now(),
      prices: { P: 37, M: 52, G: 66 },
    },
    categories,
    pizzaConfig,
    isLoading: false,
    variationNames: ['Frango', 'Carne', 'Queijo'],
  },
};
