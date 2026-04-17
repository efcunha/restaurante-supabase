import type { Meta, StoryObj } from '@storybook/react';
import CancellationReportScreen from '../../../restaurante-web/src/screens/CancellationReportScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof CancellationReportScreen> = {
  title: 'Projects/Restaurante Web/Screens/CancellationReportScreen',
  component: CancellationReportScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof CancellationReportScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CancellationReportScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <CancellationReportScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <CancellationReportScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CancellationReportScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CancellationReportScreen />;
  },
};
