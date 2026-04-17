import type { Meta, StoryObj } from '@storybook/react';
import ExtrasConfigScreen from '../../../restaurante-web/src/screens/ExtrasConfigScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ExtrasConfigScreen> = {
  title: 'Projects/Restaurante Web/Screens/ExtrasConfigScreen',
  component: ExtrasConfigScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ExtrasConfigScreen>;

function renderScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <ExtrasConfigScreen onClose={() => undefined} />;
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
    return withDisabledFieldset(() => <ExtrasConfigScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderScreen('default'),
};
