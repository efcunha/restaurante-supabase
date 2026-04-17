import type { Meta, StoryObj } from '@storybook/react';
import ReservasScreen from '../../../restaurante-app/src/screens/ReservasScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ReservasScreen> = {
  title: 'Projects/Restaurante App/Screens/ReservasScreen',
  component: ReservasScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof ReservasScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ReservasScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <ReservasScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <ReservasScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ReservasScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <ReservasScreen />;
  },
};
