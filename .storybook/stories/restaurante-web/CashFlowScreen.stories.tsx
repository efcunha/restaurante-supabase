import type { Meta, StoryObj } from '@storybook/react';
import CashFlowScreen from '../../../restaurante-web/src/screens/CashFlowScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof CashFlowScreen> = {
  title: 'Projects/Restaurante Web/Screens/CashFlowScreen',
  component: CashFlowScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof CashFlowScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CashFlowScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <CashFlowScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <CashFlowScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CashFlowScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CashFlowScreen />;
  },
};
