import type { Meta, StoryObj } from '@storybook/react';
import DeliveryScreen from '../../../restaurante-web/src/screens/DeliveryScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof DeliveryScreen> = {
  title: 'Projects/Restaurante Web/Screens/DeliveryScreen',
  component: DeliveryScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof DeliveryScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <DeliveryScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <DeliveryScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryScreen />;
  },
};
