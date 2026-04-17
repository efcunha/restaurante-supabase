import type { Meta, StoryObj } from '@storybook/react';
import PagamentoScreen from '../../../restaurante-web/src/screens/PagamentoScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof PagamentoScreen> = {
  title: 'Projects/Restaurante Web/Screens/PagamentoScreen',
  component: PagamentoScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof PagamentoScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PagamentoScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <PagamentoScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <PagamentoScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PagamentoScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <PagamentoScreen />;
  },
};
