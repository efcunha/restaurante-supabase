import type { Meta, StoryObj } from '@storybook/react';
import FinancialConfigScreen from '../../../restaurante-web/src/screens/FinancialConfigScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof FinancialConfigScreen> = {
  title: 'Projects/Restaurante Web/Screens/FinancialConfigScreen',
  component: FinancialConfigScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof FinancialConfigScreen>;

function renderScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <FinancialConfigScreen onClose={() => undefined} />;
}

export const Default: Story = {
  render: () => renderScreen('default'),
};

export const Error: Story = {
  render: () => renderScreen('error'),
};

export const Loading: Story = {
  render: () => renderScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <FinancialConfigScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderScreen('default'),
};
