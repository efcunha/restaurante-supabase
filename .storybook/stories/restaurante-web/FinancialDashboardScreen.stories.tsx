import type { Meta, StoryObj } from '@storybook/react';
import FinancialDashboardScreen from '../../../restaurante-web/src/screens/FinancialDashboardScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof FinancialDashboardScreen> = {
  title: 'Projects/Restaurante Web/Screens/FinancialDashboardScreen',
  component: FinancialDashboardScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof FinancialDashboardScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FinancialDashboardScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <FinancialDashboardScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <FinancialDashboardScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FinancialDashboardScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FinancialDashboardScreen />;
  },
};
