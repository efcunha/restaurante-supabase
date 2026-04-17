import type { Meta, StoryObj } from '@storybook/react';
import CaixaFechamentoScreen from '../../../restaurante-app/src/screens/CaixaFechamentoScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof CaixaFechamentoScreen> = {
  title: 'Projects/Restaurante App/Screens/CaixaFechamentoScreen',
  component: CaixaFechamentoScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof CaixaFechamentoScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaFechamentoScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <CaixaFechamentoScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <CaixaFechamentoScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaFechamentoScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CaixaFechamentoScreen />;
  },
};
