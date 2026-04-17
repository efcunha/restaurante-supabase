import type { Meta, StoryObj } from '@storybook/react';
import PublicMenuScreen from '../../../restaurante-web/src/screens/PublicMenuScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof PublicMenuScreen> = {
  title: 'Projects/Restaurante Web/Screens/PublicMenuScreen',
  component: PublicMenuScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof PublicMenuScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PublicMenuScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <PublicMenuScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <PublicMenuScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PublicMenuScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PublicMenuScreen />;
  },
};
