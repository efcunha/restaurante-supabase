import type { Meta, StoryObj } from '@storybook/react';
import DeliveryOcorrenciasScreen from '../../../restaurante-web/src/screens/DeliveryOcorrenciasScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof DeliveryOcorrenciasScreen> = {
  title: 'Projects/Restaurante Web/Screens/DeliveryOcorrenciasScreen',
  component: DeliveryOcorrenciasScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof DeliveryOcorrenciasScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryOcorrenciasScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <DeliveryOcorrenciasScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <DeliveryOcorrenciasScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryOcorrenciasScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <DeliveryOcorrenciasScreen />;
  },
};
