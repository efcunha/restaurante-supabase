import type { Meta, StoryObj } from '@storybook/react';
import MapaMesasScreen from '../../../restaurante-app/src/screens/MapaMesasScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof MapaMesasScreen> = {
  title: 'Projects/Restaurante App/Screens/MapaMesasScreen',
  component: MapaMesasScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof MapaMesasScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MapaMesasScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <MapaMesasScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <MapaMesasScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MapaMesasScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <MapaMesasScreen />;
  },
};
