import type { Meta, StoryObj } from '@storybook/react';
import AdminScreen from '../../../restaurante-web/src/screens/AdminScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof AdminScreen> = {
  title: 'Projects/Restaurante Web/Screens/AdminScreen',
  component: AdminScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof AdminScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AdminScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <AdminScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <AdminScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AdminScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AdminScreen />;
  },
};
