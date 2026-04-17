import { LoginForm } from '@restaurante/ui';
import type { Meta, StoryObj } from '@storybook/react';
import { fillLogin, triggerLoading, triggerValidationError } from '../shared/formInteractions';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof LoginForm> = {
  title: 'Projects/Restaurante Site/Forms/LoginForm',
  component: LoginForm,
  decorators: [projectFormDecorator('restaurante-site')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof LoginForm>;

export const Default: Story = { args: { onSubmit: () => undefined } };

export const Error: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await triggerValidationError(canvasElement, 'Entrar');
  },
};

export const Loading: Story = {
  args: { onSubmit: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await triggerLoading(canvasElement, 'Entrar', fillLogin);
  },
};

export const Disabled: Story = {
  render: () => withDisabledFieldset(() => <LoginForm onSubmit={() => undefined} />),
};

export const Filled: Story = {
  args: { onSubmit: () => undefined },
  play: async ({ canvasElement }) => {
    await fillLogin(canvasElement);
  },
};
