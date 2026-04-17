import type { Meta, StoryObj } from '@storybook/react';
import ConfiguracoesScreen from '../../../restaurante-web/src/screens/ConfiguracoesScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ConfiguracoesScreen> = {
  title: 'Projects/Restaurante Web/Screens/ConfiguracoesScreen',
  component: ConfiguracoesScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ConfiguracoesScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ConfiguracoesScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <ConfiguracoesScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <ConfiguracoesScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ConfiguracoesScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ConfiguracoesScreen />;
  },
};
