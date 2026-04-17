import type { Meta, StoryObj } from '@storybook/react';
import RotasDeliveryScreen from '../../../restaurante-app/src/screens/RotasDeliveryScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof RotasDeliveryScreen> = {
  title: 'Projects/Restaurante App/Screens/RotasDeliveryScreen',
  component: RotasDeliveryScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof RotasDeliveryScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <RotasDeliveryScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <RotasDeliveryScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <RotasDeliveryScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <RotasDeliveryScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <RotasDeliveryScreen />;
  },
};
