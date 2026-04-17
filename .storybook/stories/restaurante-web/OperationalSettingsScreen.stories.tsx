import type { Meta, StoryObj } from '@storybook/react';
import OperationalSettingsScreen from '../../../restaurante-web/src/screens/OperationalSettingsScreen';
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

const meta: Meta<typeof OperationalSettingsScreen> = {
  title: 'Projects/Restaurante Web/Screens/OperationalSettingsScreen',
  component: OperationalSettingsScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof OperationalSettingsScreen>;

function renderOperationalSettingsScreen(
  scenario: 'default' | 'loading' | 'error' | 'empty' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <OperationalSettingsScreen onClose={() => undefined} />;
}

export const Default: Story = {
  render: () => renderOperationalSettingsScreen('default'),
};

export const Error: Story = {
  render: () => renderOperationalSettingsScreen('error'),
};

export const Loading: Story = {
  render: () => renderOperationalSettingsScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <OperationalSettingsScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderOperationalSettingsScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['08']);
    await clickButtonByText(canvasElement, 'SALVAR CONFIGURAÇÕES');
  },
};
