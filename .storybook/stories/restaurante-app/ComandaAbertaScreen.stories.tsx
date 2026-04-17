import type { Meta, StoryObj } from '@storybook/react';
import ComandaAbertaScreen from '../../../restaurante-app/src/screens/ComandaAbertaScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ComandaAbertaScreen> = {
  title: 'Projects/Restaurante App/Screens/ComandaAbertaScreen',
  component: ComandaAbertaScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ComandaAbertaScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaAbertaScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <ComandaAbertaScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <ComandaAbertaScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaAbertaScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ComandaAbertaScreen />;
  },
};
