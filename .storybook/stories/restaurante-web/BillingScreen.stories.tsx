import type { Meta, StoryObj } from '@storybook/react';
import BillingScreen from '../../../restaurante-web/src/screens/BillingScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof BillingScreen> = {
  title: 'Projects/Restaurante Web/Screens/BillingScreen',
  component: BillingScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof BillingScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <BillingScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <BillingScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <BillingScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <BillingScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <BillingScreen />;
  },
};
