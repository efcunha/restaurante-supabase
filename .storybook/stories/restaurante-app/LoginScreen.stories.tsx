import type { Meta, StoryObj } from '@storybook/react';
import LoginScreen from '../../../restaurante-app/src/screens/LoginScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import {
  applyStorybookScenario,
  clickButtonByText,
  createNavigationMock,
  fillInputsByIndex,
} from '../shared/screenStoryHelpers';

const meta: Meta<typeof LoginScreen> = {
  title: 'Projects/Restaurante App/Screens/LoginScreen',
  component: LoginScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof LoginScreen>;

function renderLoginScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <LoginScreen navigation={createNavigationMock() as never} />;
}

export const Default: Story = {
  render: () => renderLoginScreen('default'),
};

export const Error: Story = {
  render: () => renderLoginScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['admin@restaurante.com', 'SenhaForte123']);
    await clickButtonByText(canvasElement, 'ENTRAR');
  },
};

export const Loading: Story = {
  render: () => renderLoginScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['admin@restaurante.com', 'SenhaForte123']);
    await clickButtonByText(canvasElement, 'ENTRAR');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <LoginScreen navigation={createNavigationMock() as never} />);
  },
};

export const Filled: Story = {
  render: () => renderLoginScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['admin@restaurante.com', 'SenhaForte123']);
  },
};
