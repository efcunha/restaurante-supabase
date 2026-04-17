import type { Meta, StoryObj } from '@storybook/react';
import NovoPedidoScreen from '../../../restaurante-web/src/screens/NovoPedidoScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof NovoPedidoScreen> = {
  title: 'Projects/Restaurante Web/Screens/NovoPedidoScreen',
  component: NovoPedidoScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof NovoPedidoScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <NovoPedidoScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <NovoPedidoScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <NovoPedidoScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <NovoPedidoScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <NovoPedidoScreen />;
  },
};
