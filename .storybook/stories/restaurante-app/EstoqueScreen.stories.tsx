import type { Meta, StoryObj } from '@storybook/react';
import EstoqueScreen from '../../../restaurante-app/src/screens/EstoqueScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof EstoqueScreen> = {
  title: 'Projects/Restaurante App/Screens/EstoqueScreen',
  component: EstoqueScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof EstoqueScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <EstoqueScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <EstoqueScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <EstoqueScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <EstoqueScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <EstoqueScreen />;
  },
};
