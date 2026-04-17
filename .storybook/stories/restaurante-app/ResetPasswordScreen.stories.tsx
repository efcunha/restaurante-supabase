import type { Meta, StoryObj } from '@storybook/react';
import ResetPasswordScreen from '../../../restaurante-app/src/screens/ResetPasswordScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import {
  applyStorybookScenario,
  clickButtonByText,
  fillInputsByIndex,
} from '../shared/screenStoryHelpers';

const passwordValues = ['SenhaNova123', 'SenhaNova123'];

const meta: Meta<typeof ResetPasswordScreen> = {
  title: 'Projects/Restaurante App/Screens/ResetPasswordScreen',
  component: ResetPasswordScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof ResetPasswordScreen>;

function renderResetPasswordScreen(
  scenario: 'default' | 'loading' | 'error' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <ResetPasswordScreen />;
}

export const Default: Story = {
  render: () => renderResetPasswordScreen('default'),
};

export const Error: Story = {
  render: () => renderResetPasswordScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, passwordValues);
    await clickButtonByText(canvasElement, 'ATUALIZAR SENHA');
  },
};

export const Loading: Story = {
  render: () => renderResetPasswordScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, passwordValues);
    await clickButtonByText(canvasElement, 'ATUALIZAR SENHA');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <ResetPasswordScreen />);
  },
};

export const Filled: Story = {
  render: () => renderResetPasswordScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, passwordValues);
  },
};
