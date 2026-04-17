import type { Meta, StoryObj } from '@storybook/react';
import ConfiguracaoMesasScreen from '../../../restaurante-app/src/screens/ConfiguracaoMesasScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ConfiguracaoMesasScreen> = {
  title: 'Projects/Restaurante App/Screens/ConfiguracaoMesasScreen',
  component: ConfiguracaoMesasScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ConfiguracaoMesasScreen>;

function renderScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <ConfiguracaoMesasScreen onClose={() => undefined} />;
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
    return withDisabledFieldset(() => <ConfiguracaoMesasScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderScreen('default'),
};
