import type { Meta, StoryObj } from '@storybook/react';
import ComandaGerenciamentoScreen from '../../../restaurante-app/src/screens/ComandaGerenciamentoScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ComandaGerenciamentoScreen> = {
  title: 'Projects/Restaurante App/Screens/ComandaGerenciamentoScreen',
  component: ComandaGerenciamentoScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ComandaGerenciamentoScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaGerenciamentoScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <ComandaGerenciamentoScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <ComandaGerenciamentoScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaGerenciamentoScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaGerenciamentoScreen />;
  },
};
