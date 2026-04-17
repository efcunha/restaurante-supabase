import type { Meta, StoryObj } from '@storybook/react';
import UpdateCardapioScreen from '../../../restaurante-web/src/screens/UpdateCardapioScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof UpdateCardapioScreen> = {
  title: 'Projects/Restaurante Web/Screens/UpdateCardapioScreen',
  component: UpdateCardapioScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof UpdateCardapioScreen>;

function renderScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <UpdateCardapioScreen />;
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
    return withDisabledFieldset(() => <UpdateCardapioScreen />);
  },
};

export const Filled: Story = {
  render: () => renderScreen('default'),
};
