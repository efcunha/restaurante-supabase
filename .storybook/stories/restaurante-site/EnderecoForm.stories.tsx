import { EnderecoForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { fillEndereco, triggerLoading, triggerValidationError } from '../shared/formInteractions';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof EnderecoForm> = {
  title: 'Projects/Restaurante Site/Forms/EnderecoForm',
  component: EnderecoForm,
  decorators: [projectFormDecorator('restaurante-site')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof EnderecoForm>;

export const Default: Story = { args: { onSubmit: () => undefined } };

export const Error: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await triggerValidationError(canvasElement, 'Salvar endereco');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await triggerLoading(canvasElement, 'Salvar endereco', fillEndereco);
  },
};

export const Disabled: Story = {
  render: () => withDisabledFieldset(() => <EnderecoForm onSubmit={() => undefined} />),
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await fillEndereco(canvasElement);
  },
};
