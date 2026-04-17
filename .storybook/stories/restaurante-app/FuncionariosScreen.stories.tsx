import type { Meta, StoryObj } from '@storybook/react';
import FuncionariosScreen from '../../../restaurante-app/src/screens/FuncionariosScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof FuncionariosScreen> = {
  title: 'Projects/Restaurante App/Screens/FuncionariosScreen',
  component: FuncionariosScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof FuncionariosScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FuncionariosScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <FuncionariosScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <FuncionariosScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FuncionariosScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <FuncionariosScreen />;
  },
};
