import type { Meta, StoryObj } from '@storybook/react';
import PerformanceDashboardScreen from '../../../restaurante-web/src/screens/PerformanceDashboardScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof PerformanceDashboardScreen> = {
  title: 'Projects/Restaurante Web/Screens/PerformanceDashboardScreen',
  component: PerformanceDashboardScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof PerformanceDashboardScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PerformanceDashboardScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <PerformanceDashboardScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <PerformanceDashboardScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PerformanceDashboardScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PerformanceDashboardScreen />;
  },
};
