import type { Meta, StoryObj } from '@storybook/react';
import CaixaHistoricoScreen from '../../../restaurante-web/src/screens/CaixaHistoricoScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof CaixaHistoricoScreen> = {
  title: 'Projects/Restaurante Web/Screens/CaixaHistoricoScreen',
  component: CaixaHistoricoScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof CaixaHistoricoScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaHistoricoScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <CaixaHistoricoScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <CaixaHistoricoScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaHistoricoScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaHistoricoScreen />;
  },
};
