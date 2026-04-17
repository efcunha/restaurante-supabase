import { CadastroForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { fillCadastro, triggerLoading, triggerValidationError } from '../shared/formInteractions';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof CadastroForm> = {
  title: 'Projects/Restaurante App/Forms/CadastroForm',
  component: CadastroForm,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof CadastroForm>;

export const Default: Story = { args: { onSubmit: () => undefined } };

export const Error: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await triggerValidationError(canvasElement, 'Criar conta');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await triggerLoading(canvasElement, 'Criar conta', fillCadastro);
  },
};

export const Disabled: Story = {
  render: () => withDisabledFieldset(() => <CadastroForm onSubmit={() => undefined} />),
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await fillCadastro(canvasElement);
  },
};
