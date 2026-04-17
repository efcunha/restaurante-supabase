import type { Meta, StoryObj } from '@storybook/react';
import OverflowMenuScreen from '../../../restaurante-app/src/screens/OverflowMenuScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof OverflowMenuScreen> = {
  title: 'Projects/Restaurante App/Screens/OverflowMenuScreen',
  component: OverflowMenuScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof OverflowMenuScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <OverflowMenuScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <OverflowMenuScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <OverflowMenuScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <OverflowMenuScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <OverflowMenuScreen />;
  },
};
