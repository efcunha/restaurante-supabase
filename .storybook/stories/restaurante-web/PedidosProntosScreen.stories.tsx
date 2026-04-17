import type { Meta, StoryObj } from '@storybook/react';
import PedidosProntosScreen from '../../../restaurante-web/src/screens/PedidosProntosScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof PedidosProntosScreen> = {
  title: 'Projects/Restaurante Web/Screens/PedidosProntosScreen',
  component: PedidosProntosScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof PedidosProntosScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PedidosProntosScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <PedidosProntosScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <PedidosProntosScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PedidosProntosScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PedidosProntosScreen />;
  },
};
