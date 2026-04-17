import type { Meta, StoryObj } from '@storybook/react';
import MontagemScreen from '../../../restaurante-web/src/screens/MontagemScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof MontagemScreen> = {
  title: 'Projects/Restaurante Web/Screens/MontagemScreen',
  component: MontagemScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof MontagemScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MontagemScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <MontagemScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <MontagemScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MontagemScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MontagemScreen />;
  },
};
