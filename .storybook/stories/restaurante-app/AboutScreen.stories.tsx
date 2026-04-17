import type { Meta, StoryObj } from '@storybook/react';
import AboutScreen from '../../../restaurante-app/src/screens/AboutScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof AboutScreen> = {
  title: 'Projects/Restaurante App/Screens/AboutScreen',
  component: AboutScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof AboutScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AboutScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <AboutScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <AboutScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AboutScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <AboutScreen />;
  },
};
