import type { Meta, StoryObj } from '@storybook/react';
import ComandaVisualizacaoAdminScreen from '../../../restaurante-app/src/screens/ComandaVisualizacaoAdminScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ComandaVisualizacaoAdminScreen> = {
  title: 'Projects/Restaurante App/Screens/ComandaVisualizacaoAdminScreen',
  component: ComandaVisualizacaoAdminScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ComandaVisualizacaoAdminScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaVisualizacaoAdminScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <ComandaVisualizacaoAdminScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <ComandaVisualizacaoAdminScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaVisualizacaoAdminScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaVisualizacaoAdminScreen />;
  },
};
